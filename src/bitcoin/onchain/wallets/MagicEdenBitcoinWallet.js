import { SatsConnectBitcoinWallet } from "./SatsConnectBitcoinWallet";
export class MagicEdenBitcoinWallet extends SatsConnectBitcoinWallet {
    static async isInstalled() {
        if (await SatsConnectBitcoinWallet.isInstalled()) {
            if (MagicEdenBitcoinWallet.checkCorrectWallet())
                return true;
        }
        return false;
    }
    static init(_data) {
        return SatsConnectBitcoinWallet.init(MagicEdenBitcoinWallet.walletName, MagicEdenBitcoinWallet.iconUrl, MagicEdenBitcoinWallet, _data);
    }
    static checkCorrectWallet() {
        return !!window.magicEden;
    }
}
MagicEdenBitcoinWallet.iconUrl = "wallets/btc/MagicEden.png";
MagicEdenBitcoinWallet.walletName = "Magic Eden";
