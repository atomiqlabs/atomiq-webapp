import { createContext } from 'react';
export const BitcoinWalletContext = createContext({
    bitcoinWallet: null,
    connect: (walletType) => Promise.resolve(),
    disconnect: () => { },
    usableWallets: []
});
