import {UnisatLikeBitcoinWallet} from "./base/UnisatLikeBitcoinWallet";

const getProvider = () => (window as any)?.keplr?.bitcoin;

export class KeplrBitcoinWallet extends UnisatLikeBitcoinWallet {

    static installUrl: string = "https://www.keplr.app/get";
    static iconUrl: string = "wallets/btc/keplr.png";
    static walletName: string = "Keplr";

    static async isInstalled(): Promise<boolean> {
        return UnisatLikeBitcoinWallet._isInstalled(
            getProvider,
            KeplrBitcoinWallet,
            KeplrBitcoinWallet.walletName
        );
    }

    static async init(_data?: any): Promise<KeplrBitcoinWallet> {
        return UnisatLikeBitcoinWallet._init(
            getProvider,
            KeplrBitcoinWallet,
            KeplrBitcoinWallet.walletName,
            _data
        );
    }

    getIcon(): string {
        return KeplrBitcoinWallet.iconUrl;
    }

    getName(): string {
        return KeplrBitcoinWallet.walletName;
    }

}
