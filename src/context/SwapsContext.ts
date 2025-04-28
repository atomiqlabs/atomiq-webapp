import { createContext } from 'react';
import {ISwap, Swapper} from "@atomiqlabs/sdk";

export const SwapsContext: React.Context<{
    actionableSwaps: ISwap[],
    swapper: Swapper<any>
}> = createContext({
    actionableSwaps: [],
    swapper: null
});
