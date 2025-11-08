import { ISwap, Swapper } from '@atomiqlabs/sdk';
import { useContext } from 'react';
import { SwapsContext } from '../context/SwapsContext';
import { useWithAwait } from '../../utils/hooks/useWithAwait';

export function useExistingSwap(swapId: string): [ISwap, boolean] {
  const { swapper } = useContext(SwapsContext);

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
