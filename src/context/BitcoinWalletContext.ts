import { createContext } from 'react';
import {BitcoinWallet} from "../bitcoin/onchain/BitcoinWallet";
import {BitcoinWalletType} from "../bitcoin/onchain/BitcoinWalletUtils";

export const BitcoinWalletContext: React.Context<{
    bitcoinWallet: BitcoinWallet,
    connect: (walletType: BitcoinWalletType) => Promise<void>,
    disconnect: () => void,
    usableWallets: BitcoinWalletType[]
}> = createContext({
    bitcoinWallet: null,
    connect: (walletType: BitcoinWalletType) => Promise.resolve(),
    disconnect: () => {},
    usableWallets: []
});
