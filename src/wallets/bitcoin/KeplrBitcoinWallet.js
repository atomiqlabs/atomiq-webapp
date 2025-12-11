import { UnisatLikeBitcoinWallet } from './base/UnisatLikeBitcoinWallet';
import { BitcoinNetwork } from "@atomiqlabs/sdk";
const getProvider = () => window?.keplr?.bitcoin;
export class KeplrBitcoinWallet extends UnisatLikeBitcoinWallet {
    static async isInstalled() {
        return UnisatLikeBitcoinWallet._isInstalled(getProvider, KeplrBitcoinWallet, KeplrBitcoinWallet.walletName);
    }
    static async init(_data) {
        return UnisatLikeBitcoinWallet._init(getProvider, KeplrBitcoinWallet, KeplrBitcoinWallet.walletName, _data);
    }
    getIcon() {
        return KeplrBitcoinWallet.iconUrl;
    }
    getName() {
        return KeplrBitcoinWallet.walletName;
    }
}
KeplrBitcoinWallet.supportedNetwork = [BitcoinNetwork.MAINNET, BitcoinNetwork.TESTNET];
KeplrBitcoinWallet.installUrl = 'https://www.keplr.app/get';
KeplrBitcoinWallet.iconUrl = 'wallets/btc/keplr.png';
KeplrBitcoinWallet.walletName = 'Keplr';
