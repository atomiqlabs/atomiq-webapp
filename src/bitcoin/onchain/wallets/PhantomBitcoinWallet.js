import { BitcoinWallet } from "../BitcoinWallet";
import * as bitcoin from "bitcoinjs-lib";
import * as EventEmitter from "events";
const addressTypePriorities = {
    "p2tr": 0,
    "p2wpkh": 1,
    "p2sh": 2,
    "p2pkh": 3
};
const ADDRESS_FORMAT_MAP = {
    "p2tr": "p2tr",
    "p2wpkh": "p2wpkh",
    "p2sh": "p2sh-p2wpkh",
    "p2pkh": "p2pkh"
};
function getPaymentAccount(accounts) {
    console.log("Loaded wallet accounts: ", accounts);
    const paymentAccounts = accounts.filter(e => e.purpose === "payment");
    if (paymentAccounts.length === 0)
        throw new Error("No valid payment account found");
    paymentAccounts.sort((a, b) => addressTypePriorities[a.addressType] - addressTypePriorities[b.addressType]);
    return paymentAccounts[0];
}
const events = new EventEmitter();
const provider = window?.phantom?.bitcoin;
let currentAccount = null;
let ignoreAccountChange;
if (provider != null)
    provider.on("accountsChanged", (accounts) => {
        console.log("PhantomBitcoinWallet: accountsChanged, ignore: " + ignoreAccountChange + " accounts: ", accounts);
        if (ignoreAccountChange)
            return;
        let btcWalletState = BitcoinWallet.loadState();
        if (btcWalletState == null || btcWalletState.name !== PhantomBitcoinWallet.walletName)
            return;
        if (accounts != null && accounts.length > 0) {
            const paymentAccount = getPaymentAccount(accounts);
            if (currentAccount != null && paymentAccount.address == currentAccount.address)
                return;
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
        }
        else {
            events.emit("newWallet", null);
        }
    });
export class PhantomBitcoinWallet extends BitcoinWallet {
    constructor(account, wasAutomaticallyConnected) {
        super(wasAutomaticallyConnected);
        this.account = account;
    }
    static isInstalled() {
        const isPhantomInstalled = window?.phantom?.bitcoin?.isPhantom;
        return Promise.resolve(isPhantomInstalled);
    }
    static async init(_data) {
        if (_data?.account != null) {
            const data = _data;
            await new Promise(resolve => setTimeout(resolve, 750));
        }
        if (provider == null)
            throw new Error("Phantom bitcoin wallet not found");
        if (provider.isPhantom == null)
            throw new Error("Provider is not Phantom wallet");
        ignoreAccountChange = true;
        let accounts;
        try {
            accounts = await provider.requestAccounts();
        }
        catch (e) {
            ignoreAccountChange = false;
            throw e;
        }
        ignoreAccountChange = false;
        const paymentAccount = getPaymentAccount(accounts);
        currentAccount = paymentAccount;
        BitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
            account: paymentAccount,
            multichainConnected: _data?.multichainConnected
        });
        return new PhantomBitcoinWallet(paymentAccount, _data?.multichainConnected);
    }
    getBalance() {
        return super._getBalance(this.account.address);
    }
    getReceiveAddress() {
        return this.account.address;
    }
    getSpendableBalance() {
        return this._getSpendableBalance(this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType]);
    }
    async getTransactionFee(address, amount, feeRate) {
        const { psbt, fee } = await super._getPsbt(this.account.publicKey, this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType], address, amount.toNumber(), feeRate);
        if (psbt == null)
            return null;
        return fee;
    }
    async sendTransaction(address, amount, feeRate) {
        const { psbt } = await super._getPsbt(this.account.publicKey, this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType], address, amount.toNumber(), feeRate);
        if (psbt == null) {
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
    getName() {
        return PhantomBitcoinWallet.walletName;
    }
    getIcon() {
        return PhantomBitcoinWallet.iconUrl;
    }
    offWalletChanged(cbk) {
        events.off("newWallet", cbk);
    }
    onWalletChanged(cbk) {
        events.on("newWallet", cbk);
    }
}
PhantomBitcoinWallet.iconUrl = "wallets/btc/phantom.png";
PhantomBitcoinWallet.walletName = "Phantom";
