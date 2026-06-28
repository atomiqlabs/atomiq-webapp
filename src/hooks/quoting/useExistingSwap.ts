import { ISwap, Swapper } from '@atomiqlabs/sdk';
import { useContext } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useWithAwait } from '../utils/useWithAwait';

export function useExistingSwap(swapId: string): [ISwap, boolean] {
  const { initializedSwapper } = useContext(SwapperContext);

  const [result, loading] = useWithAwait<{swapperInitializing: boolean, swap: ISwap}>(
    async () => {
      if (swapId == null) return {swapperInitializing: false, swap: null};
      if (initializedSwapper == null) return {swapperInitializing: true, swap: null};
      return {swapperInitializing: false, swap: await initializedSwapper.getSwapById(swapId)};
    },
    [initializedSwapper, swapId],
    true
  );

  return [result?.swap, loading || result?.swapperInitializing];
}
