import { createContext } from 'react';
import {ISwap, Swapper} from "@atomiqlabs/sdk";

export const SwapsContext: React.Context<{
    swapper: Swapper<any>
}> = createContext({
    swapper: null
});
