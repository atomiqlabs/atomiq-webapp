import { useContext } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useWithAwait } from '../utils/useWithAwait';
export function useExistingSwap(swapId) {
    const { swapper } = useContext(SwapperContext);
    const [loading, swap] = useWithAwait(() => {
        if (swapper == null || swapId == null)
            return Promise.resolve(null);
        return swapper.getSwapById(swapId);
    }, [swapper, swapId], true);
    return [loading, swap];
}
