import { UnisatLikeBitcoinWallet } from './base/UnisatLikeBitcoinWallet';
import { BitcoinNetwork } from "@atomiqlabs/sdk";
const getProvider = () => {
    const provider = window?.unisat;
    if (provider?.isBitKeep || provider?.isBitKeepChrome)
        return null;
    return provider;
};
export class UnisatBitcoinWallet extends UnisatLikeBitcoinWallet {
    static async isInstalled() {
        return UnisatLikeBitcoinWallet._isInstalled(getProvider, UnisatBitcoinWallet, UnisatBitcoinWallet.walletName);
    }
    static async init(_data) {
        return UnisatLikeBitcoinWallet._init(getProvider, UnisatBitcoinWallet, UnisatBitcoinWallet.walletName, _data);
    }
    getIcon() {
        return UnisatBitcoinWallet.iconUrl;
    }
    getName() {
        return UnisatBitcoinWallet.walletName;
    }
}
UnisatBitcoinWallet.supportedNetwork = [BitcoinNetwork.MAINNET, BitcoinNetwork.TESTNET, BitcoinNetwork.TESTNET4];
UnisatBitcoinWallet.installUrl = 'https://unisat.io/download';
UnisatBitcoinWallet.iconUrl = 'wallets/btc/unisat.png';
UnisatBitcoinWallet.walletName = 'UniSat';
