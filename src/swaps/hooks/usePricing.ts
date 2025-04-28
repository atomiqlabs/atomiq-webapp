import {Swapper, Token} from "@atomiqlabs/sdk";
import {useContext} from "react";
import {SwapsContext} from "../../context/SwapsContext";
import {useWithAwait} from "../../utils/hooks/useWithAwait";

export function usePricing(rawAmount: bigint, currency: Token<any>): number {
    const {swapper} = useContext(SwapsContext);

    const [value] = useWithAwait<[bigint, Token, Swapper<any>], number>((rawAmount: bigint, currency: Token<any>, swapper: Swapper<any>) => {
        if(swapper==null || currency==null || rawAmount==null) return Promise.resolve(null);
        return swapper.prices.getUsdValue(rawAmount, currency);
    }, [rawAmount, currency, swapper], true);

    return value;
}
