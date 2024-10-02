import { SatsConnectBitcoinWallet } from "./SatsConnectBitcoinWallet";
export class XdefiBitcoinWallet extends SatsConnectBitcoinWallet {
    static async isInstalled() {
        if (await SatsConnectBitcoinWallet.isInstalled()) {
            if (XdefiBitcoinWallet.checkCorrectWallet())
                return true;
        }
        return false;
    }
    static init(_data) {
        return SatsConnectBitcoinWallet.init(XdefiBitcoinWallet.walletName, XdefiBitcoinWallet.iconUrl, XdefiBitcoinWallet, _data);
    }
    static checkCorrectWallet() {
        return window.BitcoinProvider.chainId != null && window.BitcoinProvider.network != null;
    }
}
XdefiBitcoinWallet.iconUrl = "wallets/btc/xdefi.png";
XdefiBitcoinWallet.walletName = "XDEFI";
