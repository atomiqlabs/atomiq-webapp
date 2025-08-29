import {UnisatLikeBitcoinWallet} from "./base/UnisatLikeBitcoinWallet";
import {BitcoinNetwork} from "@atomiqlabs/sdk";

const getProvider = () => (window as any)?.okxwallet?.bitcoin;

export class OKXBitcoinWallet extends UnisatLikeBitcoinWallet {

    static installUrl: string = "https://web3.okx.com/download";
    static iconUrl: string = "wallets/btc/okx.png";
    static walletName: string = "OKX Wallet";

    static async isInstalled(): Promise<boolean> {
        return UnisatLikeBitcoinWallet._isInstalled(
            getProvider,
            OKXBitcoinWallet,
            OKXBitcoinWallet.walletName
        );
    }

    static async init(_data?: any): Promise<OKXBitcoinWallet> {
        return UnisatLikeBitcoinWallet._init(
            getProvider,
            OKXBitcoinWallet,
            OKXBitcoinWallet.walletName,
            _data
        );
    }

    getIcon(): string {
        return OKXBitcoinWallet.iconUrl;
    }

    getName(): string {
        return OKXBitcoinWallet.walletName;
    }

}