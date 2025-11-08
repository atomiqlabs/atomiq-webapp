import { UnisatLikeBitcoinWallet } from './base/UnisatLikeBitcoinWallet';

const getProvider = () => (window as any)?.unisat;

export class UnisatBitcoinWallet extends UnisatLikeBitcoinWallet {
  static installUrl: string = 'https://unisat.io/download';
  static iconUrl: string = 'wallets/btc/unisat.png';
  static walletName: string = 'UniSat';

  static async isInstalled(): Promise<boolean> {
    return UnisatLikeBitcoinWallet._isInstalled(
      getProvider,
      UnisatBitcoinWallet,
      UnisatBitcoinWallet.walletName
    );
  }

  static async init(_data?: any): Promise<UnisatBitcoinWallet> {
    return UnisatLikeBitcoinWallet._init(
      getProvider,
      UnisatBitcoinWallet,
      UnisatBitcoinWallet.walletName,
      _data
    );
  }

  getIcon(): string {
    return UnisatBitcoinWallet.iconUrl;
  }

  getName(): string {
    return UnisatBitcoinWallet.walletName;
  }
}
