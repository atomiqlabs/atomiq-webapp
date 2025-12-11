import { UnisatLikeBitcoinWallet } from "./base/UnisatLikeBitcoinWallet";
const getProvider = () => window?.okxwallet?.bitcoin;
export class OKXBitcoinWallet extends UnisatLikeBitcoinWallet {
    static async isInstalled() {
        return UnisatLikeBitcoinWallet._isInstalled(getProvider, OKXBitcoinWallet, OKXBitcoinWallet.walletName);
    }
    static async init(_data) {
        return UnisatLikeBitcoinWallet._init(getProvider, OKXBitcoinWallet, OKXBitcoinWallet.walletName, _data);
    }
    getIcon() {
        return OKXBitcoinWallet.iconUrl;
    }
    getName() {
        return OKXBitcoinWallet.walletName;
    }
}
OKXBitcoinWallet.installUrl = "https://web3.okx.com/download";
OKXBitcoinWallet.iconUrl = "wallets/btc/okx.png";
OKXBitcoinWallet.walletName = "OKX Wallet";
