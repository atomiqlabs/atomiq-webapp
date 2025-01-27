import * as BN from "bn.js";
import {BitcoinWallet} from "../BitcoinWallet";
import {CoinselectAddressTypes} from "../coinselect2/utils";
import * as bitcoin from "bitcoinjs-lib";
import * as EventEmitter from "events";

const addressTypePriorities = {
    "p2tr": 0,
    "p2wpkh": 1,
    "p2sh": 2,
    "p2pkh": 3
};

const ADDRESS_FORMAT_MAP: {[key: string]: CoinselectAddressTypes} = {
    "p2tr" : "p2tr",
    "p2wpkh": "p2wpkh",
    "p2sh": "p2sh-p2wpkh",
    "p2pkh": "p2pkh"
};

type PhantomBtcAccount = {
    address: string;
    addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
    publicKey: string;
    purpose: "payment" | "ordinals";
};

type PhantomBtcProvider = {
    requestAccounts: () => Promise<PhantomBtcAccount[]>,
    signMessage: (message: Uint8Array, address: string) => Promise<{signature: Uint8Array}>,
    signPSBT: (psbtHex: Uint8Array, options: {inputsToSign: {sigHash?: number | undefined, address: string, signingIndexes: number[]}[]}) => Promise<string>,
    isPhantom?: boolean
} & EventEmitter;

function getPaymentAccount(accounts: PhantomBtcAccount[]): PhantomBtcAccount {
    console.log("Loaded wallet accounts: ", accounts);
    const paymentAccounts = accounts.filter(e => e.purpose==="payment");
    if(paymentAccounts.length===0) throw new Error("No valid payment account found");
    paymentAccounts.sort((a, b) => addressTypePriorities[a.addressType] - addressTypePriorities[b.addressType]);
    return paymentAccounts[0];
}

const events = new EventEmitter();
const provider: PhantomBtcProvider = (window as any)?.phantom?.bitcoin;

let currentAccount: PhantomBtcAccount = null;
let ignoreAccountChange: boolean;

if(provider!=null) provider.on("accountsChanged", (accounts: PhantomBtcAccount[]) => {
    console.log("PhantomBitcoinWallet: accountsChanged, ignore: "+ignoreAccountChange+" accounts: ", accounts);
    if(ignoreAccountChange) return;
    let btcWalletState = BitcoinWallet.loadState();
    if(btcWalletState==null || btcWalletState.name!==PhantomBitcoinWallet.walletName) return;
    if(accounts!=null && accounts.length>0) {
        const paymentAccount: PhantomBtcAccount = getPaymentAccount(accounts);
        if(currentAccount!=null && paymentAccount.address==currentAccount.address) return;

        currentAccount = paymentAccount;

        BitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
            account: paymentAccount
        });
        events.emit("newWallet", new PhantomBitcoinWallet(paymentAccount, btcWalletState.data.multichainConnected));
        // ignoreAccountChange = true;
        // provider.requestAccounts().then(accounts => {
        //     ignoreAccountChange = false;
        //     const paymentAccount: PhantomBtcAccount = getPaymentAccount(accounts);
        //     currentAccount = paymentAccount;
        //     BitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
        //         account: paymentAccount
        //     });
        //     events.emit("newWallet", new PhantomBitcoinWallet(paymentAccount));
        // }).catch(e => {
        //     ignoreAccountChange = false;
        //     console.error(e);
        // })
    } else {
        events.emit("newWallet", null);
    }
});

export class PhantomBitcoinWallet extends BitcoinWallet {

    static iconUrl: string = "wallets/btc/phantom.png";
    static walletName: string = "Phantom";

    readonly account: PhantomBtcAccount;

    constructor(account: PhantomBtcAccount, wasAutomaticallyConnected: boolean) {
        super(wasAutomaticallyConnected);
        this.account = account;
    }

    static isInstalled(): Promise<boolean> {
        const isPhantomInstalled = (window as any)?.phantom?.bitcoin?.isPhantom;
        return Promise.resolve(isPhantomInstalled);
    }

    static async init(_data?: any): Promise<PhantomBitcoinWallet> {
        if(_data?.account!=null) {
            const data: {
                account: PhantomBtcAccount
            } = _data;

            await new Promise(resolve => setTimeout(resolve,750));
        }

        if(provider==null) throw new Error("Phantom bitcoin wallet not found");
        if(provider.isPhantom==null) throw new Error("Provider is not Phantom wallet");
        ignoreAccountChange = true;
        let accounts: PhantomBtcAccount[];
        try {
            accounts = await provider.requestAccounts();
        } catch (e) {
            ignoreAccountChange = false;
            throw e;
        }
        ignoreAccountChange = false;
        const paymentAccount: PhantomBtcAccount = getPaymentAccount(accounts);
        currentAccount = paymentAccount;
        BitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
            account: paymentAccount,
            multichainConnected: _data?.multichainConnected
        });
        return new PhantomBitcoinWallet(paymentAccount, _data?.multichainConnected);
    }

    getBalance(): Promise<{ confirmedBalance: BN; unconfirmedBalance: BN }> {
        return super._getBalance(this.account.address);
    }

    getReceiveAddress(): string {
        return this.account.address;
    }

    getSpendableBalance(): Promise<{
        balance: BN,
        feeRate: number,
        totalFee: number
    }> {
        return this._getSpendableBalance(this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType]);
    }

    async getTransactionFee(address: string, amount: BN, feeRate?: number): Promise<number> {
        const {psbt, fee} = await super._getPsbt(this.account.publicKey, this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType], address, amount.toNumber(), feeRate);
        if(psbt==null) return null;
        return fee;
    }

    async sendTransaction(address: string, amount: BN, feeRate?: number): Promise<string> {
        const {psbt} = await super._getPsbt(this.account.publicKey, this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType], address, amount.toNumber(), feeRate);

        if(psbt==null) {
            throw new Error("Not enough balance!");
        }

        const psbtHex = psbt.toBuffer();

        const resultSignedPsbtHex = await provider.signPSBT(psbtHex, {
            inputsToSign: [{
                sigHash: 0x01,
                address: this.account.address,
                signingIndexes: psbt.txInputs.map((e, index) => index)
            }]
        });

        const signedPsbt = bitcoin.Psbt.fromHex(resultSignedPsbtHex);
        signedPsbt.finalizeAllInputs();

        const btcTx = signedPsbt.extractTransaction();

        const btcTxHex = btcTx.toHex();

        return await super._sendTransaction(btcTxHex);
    }

    getName(): string {
        return PhantomBitcoinWallet.walletName;
    }

    getIcon(): string {
        return PhantomBitcoinWallet.iconUrl;
    }

    offWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void {
        events.off("newWallet", cbk);
    }

    onWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void {
        events.on("newWallet", cbk);
    }

}