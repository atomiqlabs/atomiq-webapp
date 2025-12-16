import { createContext } from 'react';
import { ISwap, Swapper } from '@atomiqlabs/sdk';

export const SwapperContext: React.Context<{
  swapper: Swapper<any>;
  loading: boolean;
  loadingError?: boolean;
  retry?: () => void;
}> = createContext({
  swapper: null,
  loading: false
});
