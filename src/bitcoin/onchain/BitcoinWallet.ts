import * as BN from "bn.js";
import {FEConstants} from "../../FEConstants";
import {CoinselectAddressTypes} from "./coinselect2/utils";
import {coinSelect, maxSendable} from "./coinselect2";
import * as bitcoin from "bitcoinjs-lib";
import * as randomBytes from "randombytes";
import {
    toXOnly,
} from 'bitcoinjs-lib/src/psbt/bip371';

const bitcoinNetwork = FEConstants.chain==="DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

export const ChainUtils = FEConstants.mempoolApi;

const feeMultiplier = 1.25;

export type BitcoinWalletUtxo = {
    vout: number,
    txId: string,
    value: number,
    type: CoinselectAddressTypes,
    outputScript: Buffer,
    address: string,
    cpfp?: {
        txVsize: number,
        txEffectiveFeeRate: number
    },
    confirmed: boolean
};

export abstract class BitcoinWallet {

    readonly wasAutomaticallyInitiated: boolean;

    constructor(wasAutomaticallyInitiated?: boolean) {
        this.wasAutomaticallyInitiated = wasAutomaticallyInitiated;
    }

    protected _sendTransaction(rawHex: string): Promise<string> {
        return ChainUtils.sendTransaction(rawHex);
    }

    protected _getBalance(address: string): Promise<{ confirmedBalance: BN; unconfirmedBalance: BN }> {
        return ChainUtils.getAddressBalances(address);
    }

    protected async _getUtxoPool(
        sendingAddress: string,
        sendingAddressType: CoinselectAddressTypes
    ): Promise<BitcoinWalletUtxo[]> {

        const utxos = await ChainUtils.getAddressUTXOs(sendingAddress);

        let totalSpendable = 0;

        const outputScript = bitcoin.address.toOutputScript(sendingAddress, bitcoinNetwork);

        const utxoPool: BitcoinWalletUtxo[] = [];

        for(let utxo of utxos) {
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
                    if(result.effectiveFeePerVsize==null) return null;
                    return {
                        txVsize: result.adjustedVsize,
                        txEffectiveFeeRate: result.effectiveFeePerVsize
                    }
                }) : null,
                confirmed: utxo.status.confirmed
            })
        }

        console.log("Total spendable value: "+totalSpendable+" num utxos: "+utxoPool.length);

        return utxoPool;
    }

    protected async _getPsbt(
        sendingAccounts: {
            pubkey: string,
            address: string,
            addressType: CoinselectAddressTypes,
        }[],
        address: string,
        amount: number,
        feeRate?: number
    ): Promise<{psbt: bitcoin.Psbt, fee: number, inputAddressIndexes: {[address: string]: number[]}}> {
        if(feeRate==null) feeRate = Math.floor((await ChainUtils.getFees()).fastestFee*feeMultiplier);

        const utxoPool: BitcoinWalletUtxo[] = (await Promise.all(sendingAccounts.map(acc => this._getUtxoPool(acc.address, acc.addressType)))).flat();

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

        if(coinselectResult.inputs==null || coinselectResult.outputs==null) {
            return {
                psbt: null,
                fee: coinselectResult.fee,
                inputAddressIndexes: null
            };
        }

        const psbt = new bitcoin.Psbt({
            network: bitcoinNetwork
        });

        const inputAddressIndexes: {[address: string]: number[]} = {};
        coinselectResult.inputs.forEach((input, index) => {
            inputAddressIndexes[input.address] ??= [];
            inputAddressIndexes[input.address].push(index);
        });

        console.log("Inputs: ", coinselectResult.inputs);

        psbt.addInputs(await Promise.all(coinselectResult.inputs.map(async (input) => {
            switch(input.type) {
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
                        redeemScript: bitcoin.payments.p2wpkh({pubkey: Buffer.from(accountPubkeys[input.address], "hex"), network: bitcoinNetwork}).output,
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

        if(coinselectResult.outputs.length>1) {
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

    protected async _getSpendableBalance(
        sendingAccounts: {
            address: string,
            addressType: CoinselectAddressTypes,
        }[],
    ): Promise<{
        balance: BN,
        feeRate: number,
        totalFee: number
    }> {
        const feeRate = await ChainUtils.getFees();

        const utxoPool: BitcoinWalletUtxo[] = (await Promise.all(sendingAccounts.map(acc => this._getUtxoPool(acc.address, acc.addressType)))).flat();

        console.log("Utxo pool: ", utxoPool);

        const target = bitcoin.payments.p2wsh({
            hash: randomBytes(32),
            network: FEConstants.chain==="DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
        });

        const useFeeRate = Math.floor(feeRate.fastestFee*feeMultiplier);
        let coinselectResult = maxSendable(utxoPool, target.output, "p2wsh", useFeeRate);

        console.log("Max spendable result: ", coinselectResult);

        return {
            feeRate: useFeeRate,
            balance: new BN(coinselectResult.value),
            totalFee: coinselectResult.fee
        }
    }

    static loadState(): {name: string, data?: any} {
        const txt = localStorage.getItem("btc-wallet");
        if(txt==null) return null;
        try {
            return JSON.parse(localStorage.getItem("btc-wallet"));
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    static saveState(name: string, data?: any) {
        localStorage.setItem("btc-wallet", JSON.stringify({
            name,
            data
        }));
    }

    static clearState() {
        localStorage.removeItem("btc-wallet");
    }

    abstract sendTransaction(address: string, amount: BN, feeRate?: number): Promise<string>;
    abstract getTransactionFee(address: string, amount: BN, feeRate?: number): Promise<number>;
    abstract getReceiveAddress(): string;
    abstract getBalance(): Promise<{
        confirmedBalance: BN,
        unconfirmedBalance: BN
    }>;
    abstract getSpendableBalance(): Promise<{
        balance: BN,
        feeRate: number,
        totalFee: number
    }>;

    abstract getName(): string;
    abstract getIcon(): string;

    abstract onWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void;
    abstract offWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void;

}