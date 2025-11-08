import { SatsConnectBitcoinWallet } from './base/SatsConnectBitcoinWallet';

export class MagicEdenBitcoinWallet extends SatsConnectBitcoinWallet {
  static installUrl: string = 'https://wallet.magiceden.io/download';
  static iconUrl: string = 'wallets/btc/MagicEden.png';
  static walletName: string = 'Magic Eden';

  static async isInstalled(): Promise<boolean> {
    if (await SatsConnectBitcoinWallet.isInstalled()) {
      if (MagicEdenBitcoinWallet.checkCorrectWallet()) return true;
    }
    return false;
  }

  static init(_data?: any): Promise<MagicEdenBitcoinWallet> {
    return SatsConnectBitcoinWallet.init(
      MagicEdenBitcoinWallet.walletName,
      MagicEdenBitcoinWallet.iconUrl,
      MagicEdenBitcoinWallet,
      _data
    );
  }

  static checkCorrectWallet(): boolean {
    return !!(window as any).magicEden;
  }
}
