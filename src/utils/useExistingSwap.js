import { useContext, useEffect, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
export function useExistingSwap(swapId) {
    const { swapper } = useContext(SwapsContext);
    const [swap, setSwap] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (swapper == null || swapId == null) {
            setSwap(null);
            return;
        }
        let canceled = false;
        setLoading(true);
        swapper.getSwapById(swapId).then(swap => {
            if (canceled)
                return;
            setSwap(swap);
            setLoading(false);
        });
        return () => {
            canceled = true;
            setLoading(false);
        };
    }, [swapper, swapId]);
    return [swap, loading];
}
