import { UnisatLikeBitcoinWallet } from "./base/UnisatLikeBitcoinWallet";
const getProvider = () => window?.keplr?.bitcoin;
export class KeplrBitcoinWallet extends UnisatLikeBitcoinWallet {
  static async isInstalled() {
    return UnisatLikeBitcoinWallet._isInstalled(
      getProvider,
      KeplrBitcoinWallet,
      KeplrBitcoinWallet.walletName,
    );
  }
  static async init(_data) {
    return UnisatLikeBitcoinWallet._init(
      getProvider,
      KeplrBitcoinWallet,
      KeplrBitcoinWallet.walletName,
      _data,
    );
  }
  getIcon() {
    return KeplrBitcoinWallet.iconUrl;
  }
  getName() {
    return KeplrBitcoinWallet.walletName;
  }
}
KeplrBitcoinWallet.installUrl = "https://www.keplr.app/get";
KeplrBitcoinWallet.iconUrl = "wallets/btc/keplr.png";
KeplrBitcoinWallet.walletName = "Keplr";
