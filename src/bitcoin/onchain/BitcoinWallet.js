import { FEConstants } from "../../FEConstants";
import { BitcoinNetwork, MempoolBitcoinWallet } from "@atomiqlabs/sdk";
import { NETWORK, TEST_NETWORK } from "@scure/btc-signer";
const bitcoinNetwork = FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? TEST_NETWORK : NETWORK;
const feeMultiplier = 1.25;
export class BitcoinWallet extends MempoolBitcoinWallet {
    constructor(wasAutomaticallyInitiated) {
        super(FEConstants.mempoolApi, bitcoinNetwork, feeMultiplier, process.env.REACT_APP_OVERRIDE_BITCOIN_FEE == null ?
            null :
            parseInt(process.env.REACT_APP_OVERRIDE_BITCOIN_FEE));
        this.wasAutomaticallyInitiated = wasAutomaticallyInitiated;
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
    async getTransactionFee(address, amount, feeRate) {
        const { psbt, fee } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if (psbt == null)
            return null;
        return fee;
    }
    getSpendableBalance() {
        return this._getSpendableBalance(this.toBitcoinWalletAccounts());
    }
    async fundPsbt(inputPsbt, feeRate) {
        const { psbt } = await super._fundPsbt(this.toBitcoinWalletAccounts(), inputPsbt, feeRate);
        if (psbt == null) {
            throw new Error("Not enough balance!");
        }
        return psbt;
    }
}
