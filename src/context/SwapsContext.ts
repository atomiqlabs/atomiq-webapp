
import { createContext } from 'react';
import {ISwap} from "sollightning-sdk";
import {SolanaSwapper} from "sollightning-sdk/dist";

export const SwapsContext: React.Context<{
    actionableSwaps: ISwap[],
    removeSwap: (swap: ISwap) => void,
    swapper: SolanaSwapper
}> = createContext({
    actionableSwaps: [],
    removeSwap: null,
    swapper: null
});