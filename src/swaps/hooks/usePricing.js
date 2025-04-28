import { useContext } from "react";
import { SwapsContext } from "../../context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
export function usePricing(rawAmount, currency) {
    const { swapper } = useContext(SwapsContext);
    const [value] = useWithAwait((rawAmount, currency, swapper) => {
        if (swapper == null || currency == null || rawAmount == null)
            return Promise.resolve(null);
        return swapper.prices.getUsdValue(rawAmount, currency);
    }, [rawAmount, currency, swapper], true);
    return value;
}
