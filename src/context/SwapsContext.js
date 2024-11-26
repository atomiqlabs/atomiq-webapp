import { createContext } from 'react';
export const SwapsContext = createContext({
    actionableSwaps: [],
    removeSwap: null,
    swapper: null,
    chains: {},
    getSigner: null
});
