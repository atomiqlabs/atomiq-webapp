import { createContext } from 'react';
export const StarknetWalletContext = createContext({
    starknetWallet: null,
    connect: () => Promise.resolve(),
    disconnect: () => { }
});
