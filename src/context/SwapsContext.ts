import { createContext } from 'react';
import {AbstractSigner, ISwap, SCToken, Swapper} from "@atomiqlabs/sdk";

export const SwapsContext: React.Context<{
    actionableSwaps: ISwap[],
    removeSwap: (swap: ISwap) => void,
    swapper: Swapper<any>,
    chains: {
        [chainId: string]: {
            signer: AbstractSigner,
            random: boolean //Whether this is a random signer - we shouldn't allow swap initialization with random signer
        }
    }
    getSigner(swap: ISwap | SCToken): undefined | null | AbstractSigner
}> = createContext({
    actionableSwaps: [],
    removeSwap: null,
    swapper: null,
    chains: {},
    getSigner: null
});
