import { ISwap, Swapper } from '@atomiqlabs/sdk';
import { useContext } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useWithAwait } from '../utils/useWithAwait';

export function useExistingSwap(swapId: string): [ISwap, boolean] {
  const { swapper } = useContext(SwapperContext);

  const [loading, swap] = useWithAwait(
    () => {
      if (swapper == null || swapId == null) return Promise.resolve<ISwap>(null);
      return swapper.getSwapById(swapId);
    },
    [swapper, swapId],
    true
  );

  return [loading, swap];
}
