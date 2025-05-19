import {FEConstants} from "../../FEConstants";
import {CoinselectAddressTypes} from "./coinselect2/utils";
import {BitcoinNetwork, MempoolBitcoinWallet} from "@atomiqlabs/sdk";
import {NETWORK, TEST_NETWORK} from "@scure/btc-signer";

const bitcoinNetwork = FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET ? TEST_NETWORK : NETWORK;

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

export abstract class BitcoinWallet extends MempoolBitcoinWallet {

    readonly wasAutomaticallyInitiated: boolean;

    constructor(wasAutomaticallyInitiated?: boolean) {
        super(FEConstants.mempoolApi, bitcoinNetwork, feeMultiplier);
        this.wasAutomaticallyInitiated = wasAutomaticallyInitiated;
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

    abstract sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string>;
    abstract getTransactionFee(address: string, amount: bigint, feeRate?: number): Promise<number>;
    abstract getReceiveAddress(): string;
    abstract getBalance(): Promise<{
        confirmedBalance: bigint,
        unconfirmedBalance: bigint
    }>;
    abstract getSpendableBalance(): Promise<{
        balance: bigint,
        feeRate: number,
        totalFee: number
    }>;

    abstract getName(): string;
    abstract getIcon(): string;

    abstract onWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void;
    abstract offWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void;

}