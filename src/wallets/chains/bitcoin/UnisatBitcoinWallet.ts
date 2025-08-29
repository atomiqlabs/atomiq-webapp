import {UnisatLikeBitcoinWallet} from "./base/UnisatLikeBitcoinWallet";
import {BitcoinNetwork} from "@atomiqlabs/sdk";

const getProvider = () => {
    const provider = (window as any)?.unisat;
    if(provider?.isBitKeep || provider?.isBitKeepChrome) return null;
    return provider;
}

export class UnisatBitcoinWallet extends UnisatLikeBitcoinWallet {

    static readonly supportedNetwork: BitcoinNetwork[] = [BitcoinNetwork.MAINNET, BitcoinNetwork.TESTNET, BitcoinNetwork.TESTNET4];

    static installUrl: string = "https://unisat.io/download";
    static iconUrl: string = "wallets/btc/unisat.png";
    static walletName: string = "UniSat";

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