import { useContext } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
export function useExistingSwap(swapId) {
    const { swapper } = useContext(SwapsContext);
    const [loading, swap] = useWithAwait(() => {
        if (swapper == null || swapId == null)
            return Promise.resolve(null);
        return swapper.getSwapById(swapId);
    }, [swapper, swapId], true);
    return [loading, swap];
}
