import { useMemo } from "react";
import { usePricing } from "../../pricing/usePricing";
import { useChain } from "../../chains/useChain";
import { FEConstants } from "../../../FEConstants";
export function useQuoteAmountsAndAddress(quote) {
    const inputUsdValue = usePricing(quote?.getInput().amount, quote?.getInput().token);
    const outputUsdValue = usePricing(quote?.getOutput().amount, quote?.getOutput().token);
    const inputChain = useChain(quote?.getInput().token);
    const outputChain = useChain(quote?.getOutput().token);
    return {
        input: useMemo(() => (quote == null ? undefined : {
            amount: quote.getInput(),
            usdValue: inputUsdValue ? FEConstants.USDollar.format(inputUsdValue) : undefined,
            chain: inputChain
        }), [quote, inputUsdValue, inputChain]),
        output: useMemo(() => (quote == null ? undefined : {
            amount: quote.getOutput(),
            usdValue: outputUsdValue ? FEConstants.USDollar.format(outputUsdValue) : undefined,
            chain: outputChain
        }), [quote, outputUsdValue, outputChain]),
        address: useMemo(() => (quote == null ? undefined : {
            full: quote.getOutputAddress(),
            short: `${quote.getOutputAddress().slice(0, 5)}...${quote.getOutputAddress().slice(-5)}`
        }), [quote])
    };
}
