import { createContext } from 'react';
import { ISwap, Swapper } from '@atomiqlabs/sdk';

export const SwapperContext: React.Context<{
  swapper: Swapper<any>;
  loading: boolean;
  loadingError?: any;
  syncing: boolean;
  syncingError?: any;
  retry?: () => void;
}> = createContext({
  swapper: null,
  loading: false,
  syncing: false
});
