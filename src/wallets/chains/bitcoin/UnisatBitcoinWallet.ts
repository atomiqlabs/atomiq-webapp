import {ExtensionBitcoinWallet} from "./base/ExtensionBitcoinWallet";
import {CoinselectAddressTypes} from "@atomiqlabs/sdk";
import {BTC_NETWORK} from "@scure/btc-signer/utils";
import {Transaction, Address as AddressParser} from "@scure/btc-signer";
import {BitcoinWalletNonSeparated} from "./base/BitcoinWalletNonSeparated";
import * as EventEmitter from "events";

type UnisatWalletProvider = {
    requestAccounts: () => Promise<string[]>,
    getAccounts: () => Promise<string[]>,
    getPublicKey: () => Promise<string>,
    signPsbt: (psbtHex: string, options: {
        autoFinalized?: boolean,
        toSignInputs: {
            index: number,
            address?: string,
            publicKey?: string,
            sighashTypes?: number[],
            disableTweakSigner?: boolean,
            useTweakedSigner?: boolean
        }[]
    }) => Promise<string>,
    on: (event: "accountsChanged", handler: (accounts: string[]) => void) => void,
    removeListener: (event: "accountsChanged", handler: (accounts: string[]) => void) => void,
};

const events = new EventEmitter();
const getProvider: () => UnisatWalletProvider = () => (window as any)?.unisat;

let currentAccount: string = null;
let ignoreAccountChange: boolean;

let listenerSet = false;
function setAccountChangeListener() {
    if(listenerSet) return;
    listenerSet = true;
    getProvider().on("accountsChanged", (accounts: string[]) => {
        console.log("UnisatBitcoinWallet: accountsChanged, ignore: "+ignoreAccountChange+" accounts: ", accounts);
        if(ignoreAccountChange) return;
        let btcWalletState = ExtensionBitcoinWallet.loadState();
        if(btcWalletState==null || btcWalletState.name!==UnisatBitcoinWallet.walletName) return;
        if(accounts!=null && accounts.length>0) {
            if(currentAccount!=null && accounts[0]==currentAccount) return;
            currentAccount = accounts[0];
            ExtensionBitcoinWallet.saveState(UnisatBitcoinWallet.walletName, {
                account: accounts[0]
            });
            getProvider().getPublicKey().then(publicKey => {
                events.emit("newWallet", new UnisatBitcoinWallet({address: accounts[0], publicKey}, btcWalletState.data.multichainConnected));
            });
        } else {
            events.emit("newWallet", null);
        }
    });
}

function toSchnorrPubkey(ecdsaPublickey: string): string {
    return ecdsaPublickey.slice(2, 66);
}

function identifyAddressType(address: string, network: BTC_NETWORK): CoinselectAddressTypes {
    switch(AddressParser(network).decode(address).type) {
        case "pkh":
            return "p2pkh";
        case "wpkh":
            return "p2wpkh";
        case "tr":
            return "p2tr";
        case "sh":
            return "p2sh-p2wpkh"
        default:
            return null;
    }
}

type UnisatAccount = {address: string, publicKey: string};

export class UnisatBitcoinWallet extends BitcoinWalletNonSeparated {

    readonly account: UnisatAccount;
    readonly addressType: CoinselectAddressTypes;

    static installUrl: string = "https://unisat.io/download";
    static iconUrl: string = "wallets/btc/unisat.png";
    static walletName: string = "UniSat";

    constructor(account: UnisatAccount, wasAutomaticallyConnected?: boolean) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.addressType = identifyAddressType(account.address, this.network);
    }

    static async isInstalled(): Promise<boolean> {
        for(let i=0;i<10;i++) {
            if(getProvider()!=null) {
                setAccountChangeListener();
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
    }

    static async init(_data?: any): Promise<UnisatBitcoinWallet> {
        const provider = getProvider();
        if(_data?.account!=null) {
            return new UnisatBitcoinWallet(_data.account, _data?.multichainConnected);
        }

        ignoreAccountChange = true;
        let addresses: string[];
        try {
            addresses = await provider.requestAccounts();
        } catch (e) {
            ignoreAccountChange = false;
            throw e;
        }
        ignoreAccountChange = false;

        console.log("UnisatBitcoinWallet: init(): Loaded wallet accounts: ", addresses);
        if(addresses.length===0) throw new Error("No valid account found");

        currentAccount = addresses[0];

        const publicKey = await provider.getPublicKey();
        console.log("UnisatBitcoinWallet: init(): Fetched account's public key: ", publicKey);

        const acc = {
            address: addresses[0],
            publicKey
        };

        ExtensionBitcoinWallet.saveState(UnisatBitcoinWallet.walletName, {
            account: acc,
            multichainConnected: _data?.multichainConnected
        });

        return new UnisatBitcoinWallet(acc, _data?.multichainConnected);
    }

    protected _isOrdinalsAddress(address: string): boolean {
        return true;
    }

    getBalance(): Promise<{ confirmedBalance: bigint; unconfirmedBalance: bigint }> {
        return super._getBalance(this.account.address);
    }

    getReceiveAddress(): string {
        return this.account.address;
    }

    protected toBitcoinWalletAccounts(): {pubkey: string, address: string, addressType: CoinselectAddressTypes}[] {
        return [{
            pubkey: toSchnorrPubkey(this.account.publicKey), address: this.account.address, addressType: this.addressType
        }];
    }

    async sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string> {
        const {psbt} = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);

        if(psbt==null) {
            throw new Error("Not enough balance!");
        }

        const psbtHex = await getProvider().signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: true,
            toSignInputs: Array.from({length: psbt.inputsLength}, (_, i) => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey
                }
            })
        });

        if(psbtHex==null) throw new Error("User declined the transaction request");

        const finalizedPsbt = Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
        const txHex = Buffer.from(finalizedPsbt.extract()).toString("hex");
        const txId = await super._sendTransaction(txHex);

        console.log("signTransaction returned!");

        return txId;
    }

    getName(): string {
        return UnisatBitcoinWallet.walletName;
    }

    getIcon(): string {
        return UnisatBitcoinWallet.iconUrl;
    }

    offWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
        events.off("newWallet", cbk);
    }

    onWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
        events.on("newWallet", cbk);
    }

    async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
        const psbtHex = await getProvider().signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: false,
            toSignInputs: signInputs.map(i => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey
                }
            })
        });

        if(psbtHex==null) throw new Error("Transaction not properly signed by the wallet!");

        return Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
    }

}