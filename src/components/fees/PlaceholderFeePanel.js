import { jsx as _jsx } from "react/jsx-runtime";
import { toTokenAmount, } from '@atomiqlabs/sdk';
import { useMemo } from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import { GenericFeePanel } from "./GenericFeePanel";
export function PlaceholderFeePanel(props) {
    const fees = useMemo(() => {
        if (!props.inputToken || !props.outputToken)
            return [];
        return [
            {
                text: 'Swap fee',
                fee: {
                    amountInSrcToken: toTokenAmount(0n, props.inputToken, null),
                    amountInDstToken: toTokenAmount(0n, props.outputToken, null),
                    usdValue: async () => 0,
                },
                usdValue: 0,
            },
        ];
    }, [props.inputToken, props.outputToken]);
    const inputTokenUsdPrice = usePricing('1', props.inputToken);
    const outputTokenUsdPrice = usePricing('1', props.outputToken);
    const calculatedSwapPrice = useMemo(() => {
        if (!inputTokenUsdPrice || !outputTokenUsdPrice || inputTokenUsdPrice === 0)
            return null;
        return outputTokenUsdPrice / inputTokenUsdPrice;
    }, [inputTokenUsdPrice, outputTokenUsdPrice]);
    return (_jsx(GenericFeePanel, { inputToken: props.inputToken, outputToken: props.outputToken, fees: fees, totalUsdFee: 0, price: calculatedSwapPrice }));
}
