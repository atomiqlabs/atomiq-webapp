import {ISwap} from "@atomiqlabs/sdk";
import {useContext, useEffect, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";


export function useExistingSwap(swapId: string): [ISwap, boolean] {
    const {swapper} = useContext(SwapsContext);

    const [swap, setSwap] = useState<ISwap>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if(swapper==null || swapId==null) {
            setSwap(null);
            return;
        }

        let canceled = false;

        setLoading(true);
        swapper.getAllSwaps().then(swaps => {
            if(canceled) return;
            const foundSwap = swaps.find(swap => swap.getPaymentHashString()===swapId);
            setSwap(foundSwap);
            setLoading(false);
        });

        return () => {
            canceled = true;
            setLoading(false);
        }
    }, [swapper, swapId]);

    return [swap, loading];
}