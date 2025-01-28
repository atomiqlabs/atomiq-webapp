import * as BN from "bn.js";
import { BitcoinWallet, ChainUtils } from "../BitcoinWallet";
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
async function traverseToConfirmedOrdinalInputs(utxo, satsOffset = 0, satsRange = utxo.value) {
    if (utxo.value < satsOffset + satsRange)
        throw new Error("Invalid UTXO traversal range! Offset: " + satsOffset + " range: " + satsRange + " utxo value: " + utxo.value + " utxo: " + utxo.txId + ":" + utxo.vout);
    const tx = await ChainUtils.getTransaction(utxo.txId);
    if (tx.status.confirmed)
        return [utxo];
    const outputSatOffsetStart = tx.vout.slice(0, utxo.vout).reduce((prev, curr) => prev + curr.value, 0) + satsOffset;
    const outputSatOffsetEnd = outputSatOffsetStart + satsRange;
    const confirmedInputs = [];
    let inputSatCounter = 0;
    for (let input of tx.vin) {
        let inputSatOffsetStart = inputSatCounter;
        inputSatCounter += input.prevout.value;
        let inputSatOffsetEnd = inputSatCounter;
        if (outputSatOffsetStart > inputSatOffsetEnd)
            continue;
        if (inputSatOffsetStart > outputSatOffsetEnd)
            continue;
        const intersectionStart = Math.max(inputSatOffsetStart, outputSatOffsetStart);
        const intersectionEnd = Math.min(inputSatOffsetEnd, outputSatOffsetEnd);
        const inputSatOffset = intersectionStart - inputSatOffsetStart;
        const inputSatRange = intersectionEnd - intersectionStart;
        if (inputSatRange === 0)
            continue;
        console.log("Start: " + intersectionStart + " End: " + intersectionEnd);
        confirmedInputs.push(...await traverseToConfirmedOrdinalInputs({ txId: input.txid, vout: input.vout, value: input.prevout.value }, inputSatOffset, inputSatRange));
    }
    return confirmedInputs;
}
async function filterInscriptionUtxos(utxos) {
    if (utxos.length === 0)
        return utxos;
    const ancestorMap = new Map();
    for (let utxo of utxos) {
        if (!utxo.confirmed) {
            //TODO: Remove utxo from the list if the call to traverseToConfirmedOrdinalInputs fails
            const ancestorUtxos = await traverseToConfirmedOrdinalInputs(utxo);
            console.log("PhantomBitcoinWallet: filterInscriptionUtxos(): Fetched ancestors of unconfirmed utxo " + utxo.txId + ":" + utxo.vout + ", array: ", ancestorUtxos);
            ancestorUtxos.forEach(val => ancestorMap.set(val.txId + ":" + val.vout, utxo.txId + ":" + utxo.vout));
        }
        else {
            ancestorMap.set(utxo.txId + ":" + utxo.vout, utxo.txId + ":" + utxo.vout);
        }
    }
    const resp = await fetch("https://api.atomiq.exchange/api/CheckBitcoinUtxos", {
        method: "POST",
        body: JSON.stringify(Array.from(ancestorMap.keys())),
        headers: { "Content-Type": "application/json" }
    });
    if (!resp.ok)
        throw new Error("Failed to filter out inscription utxos");
    const res = await resp.json();
    const utxosWithAssetSet = new Set();
    res.forEach(utxoWithAsset => utxosWithAssetSet.add(ancestorMap.get(utxoWithAsset)));
    console.log("PhantomBitcoinWallet: filterInscriptionUtxos(): Removing utxos from pool: ", Array.from(utxosWithAssetSet));
    return utxos.filter(utxo => !utxosWithAssetSet.has(utxo.txId + ":" + utxo.vout));
}
function deduplicateAccounts(accounts) {
    const accountMap = {};
    accounts.forEach(acc => accountMap[acc.address] = acc);
    return Object.keys(accountMap).map(address => accountMap[address]);
}
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
                accounts
            });
            events.emit("newWallet", new PhantomBitcoinWallet(accounts, btcWalletState.data.multichainConnected));
        }
        else {
            events.emit("newWallet", null);
        }
    });
export class PhantomBitcoinWallet extends BitcoinWallet {
    constructor(accounts, wasAutomaticallyConnected) {
        super(wasAutomaticallyConnected);
        this.accounts = deduplicateAccounts(accounts);
        this.account = getPaymentAccount(accounts);
    }
    static isInstalled() {
        const isPhantomInstalled = window?.phantom?.bitcoin?.isPhantom;
        return Promise.resolve(isPhantomInstalled);
    }
    static async init(_data) {
        if (_data?.accounts != null) {
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
            accounts,
            multichainConnected: _data?.multichainConnected
        });
        return new PhantomBitcoinWallet(accounts, _data?.multichainConnected);
    }
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        const accountType = this.accounts.find(acc => acc.address === sendingAddress);
        //TODO: Don't use the ordinals account if filterInscriptionUtxos fails
        if (accountType.purpose === "ordinals")
            utxos = await filterInscriptionUtxos(utxos);
        return utxos;
    }
    async getBalance() {
        const balances = await Promise.all(this.accounts.map(acc => super._getBalance(acc.address)));
        return balances.reduce((prevValue, currValue) => {
            return {
                confirmedBalance: prevValue.confirmedBalance.add(currValue.confirmedBalance),
                unconfirmedBalance: prevValue.confirmedBalance.add(currValue.unconfirmedBalance),
            };
        }, { confirmedBalance: new BN(0), unconfirmedBalance: new BN(0) });
    }
    getReceiveAddress() {
        return this.account.address;
    }
    getSpendableBalance() {
        return this._getSpendableBalance(this.toBitcoinWalletAccounts());
    }
    toBitcoinWalletAccounts() {
        return this.accounts.map(acc => {
            return {
                pubkey: acc.publicKey, address: acc.address, addressType: ADDRESS_FORMAT_MAP[this.account.addressType]
            };
        });
    }
    async getTransactionFee(address, amount, feeRate) {
        const { psbt, fee } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, amount.toNumber(), feeRate);
        if (psbt == null)
            return null;
        return fee;
    }
    async sendTransaction(address, amount, feeRate) {
        const { psbt } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, amount.toNumber(), feeRate);
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
