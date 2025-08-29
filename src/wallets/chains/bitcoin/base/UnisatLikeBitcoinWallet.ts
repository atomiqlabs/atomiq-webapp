import {BitcoinNetwork, CoinselectAddressTypes} from "@atomiqlabs/sdk";
import {BTC_NETWORK} from "@scure/btc-signer/utils";
import {Transaction, Address as AddressParser} from "@scure/btc-signer";
import * as EventEmitter from "events";
import {BitcoinWalletNonSeparated} from "./BitcoinWalletNonSeparated";
import {ExtensionBitcoinWallet} from "./ExtensionBitcoinWallet";
import {FEConstants} from "../../../../FEConstants";

const UnisatNetworks = {
    [BitcoinNetwork.MAINNET]: "livenet",
    [BitcoinNetwork.TESTNET]: "testnet",
    [BitcoinNetwork.TESTNET4]: "testnet"
};

const UnisatChains = {
    [BitcoinNetwork.MAINNET]: "BITCOIN_MAINNET",
    [BitcoinNetwork.TESTNET]: "BITCOIN_TESTNET",
    [BitcoinNetwork.TESTNET4]: "BITCOIN_TESTNET4"
};

type UnisatLikeWalletProvider = {
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
    getNetwork?: () => Promise<"livenet" | "testnet">,
    switchNetwork?: (network: "livenet" | "testnet") => Promise<void>,
    getChain?: () => Promise<{enum: string, name: string, network: "livenet" | "testnet"}>,
    switchChain?: (network: string) => Promise<void>,
    on: (event: "accountsChanged", handler: (accounts: string[]) => void) => void,
    removeListener: (event: "accountsChanged", handler: (accounts: string[]) => void) => void,
};

export class UnisatLikeWalletChangeListener {
    provider: UnisatLikeWalletProvider;
    events: EventEmitter<{newWallet: [UnisatLikeBitcoinWallet]}> = new EventEmitter();
    ignoreAccountChange: boolean = false;
    currentAccount: string;

    constructor(ctor: new (account: UnisatLikeAccount, wasAutomaticallyConnected?: boolean) => UnisatLikeBitcoinWallet, provider: UnisatLikeWalletProvider, name: string) {
        this.provider = provider;
        provider.on("accountsChanged", (accounts: string[]) => {
            console.log(name+"BitcoinWallet: accountsChanged, ignore: "+this.ignoreAccountChange+" accounts: ", accounts);
            if(this.ignoreAccountChange) return;
            let btcWalletState = ExtensionBitcoinWallet.loadState();
            if(btcWalletState==null || btcWalletState.name!==name) return;
            if(accounts!=null && accounts.length>0) {
                if(this.currentAccount!=null && accounts[0]==this.currentAccount) return;
                this.currentAccount = accounts[0];
                provider.getPublicKey().then(publicKey => {
                    const account = {address: accounts[0], publicKey};
                    ExtensionBitcoinWallet.saveState(name, {
                        account,
                        multichainConnected: btcWalletState.data.multichainConnected
                    });
                    this.events.emit("newWallet", new ctor({address: accounts[0], publicKey}, btcWalletState.data.multichainConnected));
                });
            } else {
                this.events.emit("newWallet", null);
            }
        });
    }
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

type UnisatLikeAccount = {address: string, publicKey: string};

export abstract class UnisatLikeBitcoinWallet extends BitcoinWalletNonSeparated {

    static changeListeners: {[name: string]: UnisatLikeWalletChangeListener} = {};

    readonly account: UnisatLikeAccount;
    readonly addressType: CoinselectAddressTypes;
    get listener(): UnisatLikeWalletChangeListener {
        return UnisatLikeBitcoinWallet.changeListeners[this.getName()];
    }
    get provider(): UnisatLikeWalletProvider {
        return UnisatLikeBitcoinWallet.changeListeners[this.getName()]?.provider;
    }

    constructor(account: UnisatLikeAccount, wasAutomaticallyConnected?: boolean) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.addressType = identifyAddressType(account.address, this.network);
    }

    static async _isInstalled(
        getProvider: () => UnisatLikeWalletProvider,
        ctor: new (account: UnisatLikeAccount, wasAutomaticallyConnected?: boolean) => UnisatLikeBitcoinWallet,
        name: string
    ): Promise<boolean> {
        for(let i=0;i<10;i++) {
            if(getProvider()!=null) {
                UnisatLikeBitcoinWallet.changeListeners[name] ??= new UnisatLikeWalletChangeListener(ctor, getProvider(), name);
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
    }

    static async _init(
        getProvider: () => UnisatLikeWalletProvider,
        ctor: new (account: UnisatLikeAccount, wasAutomaticallyConnected?: boolean) => UnisatLikeBitcoinWallet,
        name: string,
        _data?: any
    ): Promise<UnisatLikeBitcoinWallet> {
        const provider = getProvider();
        if(_data?.account!=null) {
            return new ctor(_data.account, _data?.multichainConnected);
        }

        UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = true;
        let addresses: string[];
        try {
            addresses = await provider.requestAccounts();
        } catch (e) {
            UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = false;
            throw e;
        }

        if(provider.getChain!=null) {
            const currentChain = await provider.getChain();
            console.log("UnisatLikeBitcoinWallet: init(): Detected current chain: ", currentChain);
            const requiredChain = UnisatChains[FEConstants.bitcoinNetwork];
            if(currentChain.enum!==requiredChain) {
                await provider.switchChain(requiredChain);
                addresses = await provider.getAccounts();
            }
        } else {
            const currentNetwork = await provider.getNetwork();
            console.log("UnisatLikeBitcoinWallet: init(): Detected current network: ", currentNetwork);
            const requiredNetwork = UnisatNetworks[FEConstants.bitcoinNetwork];
            if(currentNetwork!==requiredNetwork) {
                await provider.switchNetwork(requiredNetwork);
                addresses = await provider.getAccounts();
            }
        }

        UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = false;

        console.log(name+"BitcoinWallet: init(): Loaded wallet accounts: ", addresses);
        if(addresses.length===0) throw new Error("No valid account found");

        UnisatLikeBitcoinWallet.changeListeners[name].currentAccount = addresses[0];

        const publicKey = await provider.getPublicKey();
        console.log(name+"BitcoinWallet: init(): Fetched account's public key: ", publicKey);

        const acc = {
            address: addresses[0],
            publicKey
        };

        ExtensionBitcoinWallet.saveState(name, {
            account: acc,
            multichainConnected: _data?.multichainConnected
        });

        return new ctor(acc, _data?.multichainConnected);
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

        const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
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

        return txId;
    }

    abstract getName(): string;
    abstract getIcon(): string;

    offWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
        this.listener.events.off("newWallet", cbk);
    }

    onWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
        this.listener.events.on("newWallet", cbk);
    }

    async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
        const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
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