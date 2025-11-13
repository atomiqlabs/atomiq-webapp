import { jsx as _jsx } from "react/jsx-runtime";
import { useSwapFees } from '../../hooks/fees/useSwapFees';
import { GenericFeePanel } from "./GenericFeePanel";
export function SwapFeePanel(props) {
    const { fees: swapFees, totalUsdFee } = useSwapFees(props.swap, props.btcFeeRate);
    const inputToken = props.swap?.getInput()?.token;
    const outputToken = props.swap?.getOutput()?.token;
    return (_jsx(GenericFeePanel, { inputToken: inputToken, outputToken: outputToken, fees: swapFees, isExpired: props.isExpired, price: props.swap.getPriceInfo().swapPrice, totalUsdFee: totalUsdFee, onRefreshQuote: props.onRefreshQuote, totalTime: props.totalTime, remainingTime: props.remainingTime }));
}
