import { ChainUtils } from "sollightning-sdk";
import { BitcoinWallet } from "./BitcoinWallet";
import * as bitcoin from "bitcoinjs-lib";
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
export class PhantomBitcoinWallet extends BitcoinWallet {
    constructor(provider, account) {
        super();
        this.provider = provider;
        this.account = account;
    }
    static isInstalled() {
        var _a, _b;
        const isPhantomInstalled = (_b = (_a = window === null || window === void 0 ? void 0 : window.phantom) === null || _a === void 0 ? void 0 : _a.bitcoin) === null || _b === void 0 ? void 0 : _b.isPhantom;
        return Promise.resolve(isPhantomInstalled);
    }
    static async init() {
        var _a;
        const provider = (_a = window === null || window === void 0 ? void 0 : window.phantom) === null || _a === void 0 ? void 0 : _a.bitcoin;
        if (provider == null)
            throw new Error("Phantom bitcoin wallet not found");
        if (provider.isPhantom == null)
            throw new Error("Provider is not Phantom wallet");
        const accounts = await provider.requestAccounts();
        const paymentAccounts = accounts.filter(e => e.purpose === "payment");
        if (paymentAccounts.length === 0)
            throw new Error("No valid payment account found");
        paymentAccounts.sort((a, b) => addressTypePriorities[a.addressType] - addressTypePriorities[b.addressType]);
        return new PhantomBitcoinWallet(provider, paymentAccounts[0]);
    }
    getBalance() {
        return ChainUtils.getAddressBalances(this.account.address);
    }
    getReceiveAddress() {
        return this.account.address;
    }
    async sendTransaction(address, amount) {
        const psbt = await super._getPsbt(this.account.address, ADDRESS_FORMAT_MAP[this.account.addressType], address, amount.toNumber());
        const psbtHex = psbt.toBuffer();
        const resultSignedPsbtHex = await this.provider.signPSBT(psbtHex, {
            inputsToSign: [{
                    sigHash: 0x01,
                    address: this.account.address,
                    signingIndexes: psbt.txInputs.map(e => e.index)
                }]
        });
        const signedPsbt = bitcoin.Psbt.fromHex(resultSignedPsbtHex);
        const btcTx = signedPsbt.extractTransaction();
        const btcTxHex = btcTx.toHex();
        return await ChainUtils.sendTransaction(btcTxHex);
    }
    getName() {
        return PhantomBitcoinWallet.walletName;
    }
    getIcon() {
        return PhantomBitcoinWallet.iconUrl;
    }
}
PhantomBitcoinWallet.iconUrl = "wallets/btc/phantom.png";
PhantomBitcoinWallet.walletName = "Phantom";
