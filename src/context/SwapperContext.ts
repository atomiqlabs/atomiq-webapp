import { createContext } from 'react';
import { ISwap, Swapper } from '@atomiqlabs/sdk';

export const SwapperContext: React.Context<{
  swapper: Swapper<any>;
}> = createContext({
  swapper: null,
});
