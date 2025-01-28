import * as BN from "bn.js";
import { FEConstants } from "../../FEConstants";
import { coinSelect, maxSendable } from "./coinselect2";
import * as bitcoin from "bitcoinjs-lib";
import { MempoolApi } from "@atomiqlabs/sdk";
import * as randomBytes from "randombytes";
import { toXOnly, } from 'bitcoinjs-lib/src/psbt/bip371';
const bitcoinNetwork = FEConstants.chain === "DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
export const ChainUtils = new MempoolApi(FEConstants.chain === "DEVNET" ?
    "https://mempool.space/testnet/api/" :
    "https://mempool.space/api/");
const feeMultiplier = 1.25;
export class BitcoinWallet {
    constructor(wasAutomaticallyInitiated) {
        this.wasAutomaticallyInitiated = wasAutomaticallyInitiated;
    }
    _sendTransaction(rawHex) {
        return ChainUtils.sendTransaction(rawHex);
    }
    _getBalance(address) {
        return ChainUtils.getAddressBalances(address);
    }
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        const utxos = await ChainUtils.getAddressUTXOs(sendingAddress);
        let totalSpendable = 0;
        const outputScript = bitcoin.address.toOutputScript(sendingAddress, bitcoinNetwork);
        const utxoPool = [];
        for (let utxo of utxos) {
            const value = utxo.value.toNumber();
            totalSpendable += value;
            utxoPool.push({
                vout: utxo.vout,
                txId: utxo.txid,
                value: value,
                type: sendingAddressType,
                outputScript: outputScript,
                address: sendingAddress,
                cpfp: !utxo.status.confirmed ? await ChainUtils.getCPFPData(utxo.txid).then((result) => {
                    if (result.effectiveFeePerVsize == null)
                        return null;
                    return {
                        txVsize: result.adjustedVsize,
                        txEffectiveFeeRate: result.effectiveFeePerVsize
                    };
                }) : null,
                confirmed: utxo.status.confirmed
            });
        }
        console.log("Total spendable value: " + totalSpendable + " num utxos: " + utxoPool.length);
        return utxoPool;
    }
    async _getPsbt(sendingAccounts, address, amount, feeRate) {
        if (feeRate == null)
            feeRate = Math.floor((await ChainUtils.getFees()).fastestFee * feeMultiplier);
        const utxoPool = (await Promise.all(sendingAccounts.map(acc => this._getUtxoPool(acc.address, acc.addressType)))).flat();
        const accountPubkeys = {};
        sendingAccounts.forEach(acc => accountPubkeys[acc.address] = acc.pubkey);
        const targets = [
            {
                address: address,
                value: amount,
                script: bitcoin.address.toOutputScript(address, bitcoinNetwork)
            }
        ];
        let coinselectResult = coinSelect(utxoPool, targets, feeRate, sendingAccounts[0].addressType);
        if (coinselectResult.inputs == null || coinselectResult.outputs == null) {
            return {
                psbt: null,
                fee: coinselectResult.fee,
                inputAddressIndexes: null
            };
        }
        const psbt = new bitcoin.Psbt({
            network: bitcoinNetwork
        });
        const inputAddressIndexes = {};
        coinselectResult.inputs.forEach((input, index) => {
            var _a;
            inputAddressIndexes[_a = input.address] ?? (inputAddressIndexes[_a] = []);
            inputAddressIndexes[input.address].push(index);
        });
        console.log("Inputs: ", coinselectResult.inputs);
        psbt.addInputs(await Promise.all(coinselectResult.inputs.map(async (input) => {
            switch (input.type) {
                case "p2tr":
                    return {
                        hash: input.txId,
                        index: input.vout,
                        witnessUtxo: {
                            script: input.outputScript,
                            value: input.value
                        },
                        tapInternalKey: toXOnly(Buffer.from(accountPubkeys[input.address], "hex"))
                    };
                case "p2wpkh":
                    return {
                        hash: input.txId,
                        index: input.vout,
                        witnessUtxo: {
                            script: input.outputScript,
                            value: input.value
                        },
                        sighashType: 0x01
                    };
                case "p2sh-p2wpkh":
                    return {
                        hash: input.txId,
                        index: input.vout,
                        witnessUtxo: {
                            script: input.outputScript,
                            value: input.value
                        },
                        redeemScript: bitcoin.payments.p2wpkh({ pubkey: Buffer.from(accountPubkeys[input.address], "hex"), network: bitcoinNetwork }).output,
                        sighashType: 0x01
                    };
                case "p2pkh":
                    return {
                        hash: input.txId,
                        index: input.vout,
                        nonWitnessUtxo: await ChainUtils.getRawTransaction(input.txId),
                        sighashType: 0x01
                    };
            }
        })));
        psbt.addOutput({
            script: bitcoin.address.toOutputScript(address, bitcoinNetwork),
            value: amount
        });
        if (coinselectResult.outputs.length > 1) {
            psbt.addOutput({
                script: bitcoin.address.toOutputScript(sendingAccounts[0].address, bitcoinNetwork),
                value: coinselectResult.outputs[1].value
            });
        }
        return {
            psbt,
            fee: coinselectResult.fee,
            inputAddressIndexes
        };
    }
    async _getSpendableBalance(sendingAccounts) {
        const feeRate = await ChainUtils.getFees();
        const utxoPool = (await Promise.all(sendingAccounts.map(acc => this._getUtxoPool(acc.address, acc.addressType)))).flat();
        console.log("Utxo pool: ", utxoPool);
        const target = bitcoin.payments.p2wsh({
            hash: randomBytes(32),
            network: FEConstants.chain === "DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
        });
        const useFeeRate = Math.floor(feeRate.fastestFee * feeMultiplier);
        let coinselectResult = maxSendable(utxoPool, target.output, "p2wsh", useFeeRate);
        console.log("Max spendable result: ", coinselectResult);
        return {
            feeRate: useFeeRate,
            balance: new BN(coinselectResult.value),
            totalFee: coinselectResult.fee
        };
    }
    static loadState() {
        const txt = localStorage.getItem("btc-wallet");
        if (txt == null)
            return null;
        try {
            return JSON.parse(localStorage.getItem("btc-wallet"));
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    static saveState(name, data) {
        localStorage.setItem("btc-wallet", JSON.stringify({
            name,
            data
        }));
    }
    static clearState() {
        localStorage.removeItem("btc-wallet");
    }
}
