import {SatsConnectBitcoinWallet} from "./base/SatsConnectBitcoinWallet";
import {MagicEdenBitcoinWallet} from "./MagicEdenBitcoinWallet";

export class XverseBitcoinWallet extends SatsConnectBitcoinWallet {

    static installUrl: string = "https://www.xverse.app/download";
    static iconUrl: string = "wallets/btc/xverse.png";
    static walletName: string = "Xverse";

    static async isInstalled(): Promise<boolean> {
        if(await SatsConnectBitcoinWallet.isInstalled()) {
            if(
                Object.keys(window.BitcoinProvider as any).find(key => key.startsWith("is")) == null &&
                !MagicEdenBitcoinWallet.checkCorrectWallet()
            ) return true;
        }
        return false;
    }

    static init(_data?: any): Promise<XverseBitcoinWallet> {
        return SatsConnectBitcoinWallet.init(XverseBitcoinWallet.walletName, XverseBitcoinWallet.iconUrl, XverseBitcoinWallet, _data);
    }

}