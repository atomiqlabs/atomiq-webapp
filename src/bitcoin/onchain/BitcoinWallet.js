import { FEConstants } from "../../FEConstants";
import { BitcoinNetwork, MempoolBitcoinWallet } from "@atomiqlabs/sdk";
import { NETWORK, TEST_NETWORK } from "@scure/btc-signer";
const bitcoinNetwork = FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? TEST_NETWORK : NETWORK;
const feeMultiplier = 1.25;
export class BitcoinWallet extends MempoolBitcoinWallet {
    constructor(wasAutomaticallyInitiated) {
        super(FEConstants.mempoolApi, bitcoinNetwork, feeMultiplier);
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
}
