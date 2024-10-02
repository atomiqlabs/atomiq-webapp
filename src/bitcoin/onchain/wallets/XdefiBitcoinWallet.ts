import {SatsConnectBitcoinWallet} from "./SatsConnectBitcoinWallet";

export class XdefiBitcoinWallet extends SatsConnectBitcoinWallet {

    static iconUrl: string = "wallets/btc/xdefi.png";
    static walletName: string = "XDEFI";

    static async isInstalled(): Promise<boolean> {
        if(await SatsConnectBitcoinWallet.isInstalled()) {
            if(XdefiBitcoinWallet.checkCorrectWallet()) return true;
        }
        return false;
    }

    static init(_data?: any): Promise<XdefiBitcoinWallet> {
        return SatsConnectBitcoinWallet.init(XdefiBitcoinWallet.walletName, XdefiBitcoinWallet.iconUrl, XdefiBitcoinWallet, _data);
    }

    static checkCorrectWallet(): boolean {
        return (window.BitcoinProvider as any).chainId!=null && (window.BitcoinProvider as any).network!=null;
    }

}