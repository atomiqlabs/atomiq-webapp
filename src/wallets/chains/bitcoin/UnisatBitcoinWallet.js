import { UnisatLikeBitcoinWallet } from "./base/UnisatLikeBitcoinWallet";
const getProvider = () => window?.unisat;
export class UnisatBitcoinWallet extends UnisatLikeBitcoinWallet {
    static async isInstalled() {
        return UnisatLikeBitcoinWallet._isInstalled(getProvider, UnisatBitcoinWallet, UnisatBitcoinWallet.walletName);
    }
    static async init(_data) {
        return UnisatLikeBitcoinWallet._init(getProvider, UnisatBitcoinWallet, UnisatBitcoinWallet.walletName, _data);
    }
    getIcon() {
        return UnisatBitcoinWallet.iconUrl;
    }
    getName() {
        return UnisatBitcoinWallet.walletName;
    }
}
UnisatBitcoinWallet.installUrl = "https://unisat.io/download";
UnisatBitcoinWallet.iconUrl = "wallets/btc/unisat.png";
UnisatBitcoinWallet.walletName = "UniSat";
