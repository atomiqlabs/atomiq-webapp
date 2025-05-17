import { fromHumanReadableString } from "@atomiqlabs/sdk";
import { useContext } from "react";
import { SwapsContext } from "../../swaps/context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
export function usePricing(amount, currency) {
    const { swapper } = useContext(SwapsContext);
    const [value] = useWithAwait(() => {
        if (swapper == null || currency == null || amount == null || amount === "")
            return Promise.resolve(null);
        try {
            const rawAmount = fromHumanReadableString(amount, currency);
            if (rawAmount == 0n)
                return Promise.resolve(null);
            return swapper.prices.getUsdValue(rawAmount, currency);
        }
        catch (e) {
            return Promise.resolve(null);
        }
    }, [amount, currency, swapper], true);
    return value;
}
