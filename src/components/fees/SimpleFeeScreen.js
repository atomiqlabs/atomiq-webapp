import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Accordion, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useMemo } from 'react';
import { TokenIcon } from '../tokens/TokenIcon';
import { useSwapFees } from '../../hooks/fees/useSwapFees';
import { usePricing } from '../../hooks/pricing/usePricing';
import { SwapExpiryProgressCircle } from "../swaps/SwapExpiryProgressCircle";
import { useSwapState } from "../../hooks/swaps/helpers/useSwapState";
function FeePart(props) {
    return (_jsxs("div", { className: 'd-flex font-medium ' + props.className, children: [_jsxs("small", { className: "d-flex align-items-center", children: [props.description == null ? (props.text) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'fee-tooltip-desc-' + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx("span", { className: "dottedUnderline", children: props.text }) })), props.composition == null ? ('') : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'fee-tooltip-' + props.text, children: _jsxs("span", { children: [(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1), "% +", ' ', props.composition.base.amount, " ", props.composition.base.token.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "text-decoration-dotted", children: [(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1), "%"] }) }) }))] }), _jsx("span", { className: "ms-auto fw-bold d-flex align-items-center", children: _jsx(OverlayTrigger, { placement: "left", overlay: _jsx(Tooltip, { id: 'fee-tooltip-' + props.text, className: "font-default", children: props.fee.amountInDstToken == null ? (_jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: '-2px' } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] })) : (_jsxs("span", { className: "ms-auto text-end", children: [_jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: '-1px' } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] }), _jsx("span", { className: "d-flex align-items-center justify-content-center fw-bold", children: "=" }), _jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInDstToken.token, className: "currency-icon-small" }), _jsxs("span", { children: [props.fee.amountInDstToken.amount, " ", props.fee.amountInDstToken.token.ticker] })] })] })) }), children: _jsxs("span", { className: "text-decoration-dotted font-monospace", children: ["$", (props.usdValue == null ? 0 : props.usdValue).toFixed(2)] }) }) })] }));
}
export function SimpleFeeSummaryScreen(props) {
    const { fees: swapFees, totalUsdFee } = useSwapFees(props.swap, props.btcFeeRate);
    const fees = useMemo(() => {
        if (swapFees?.length > 0)
            return swapFees;
        if (!props.inputToken || !props.outputToken)
            return [];
        // Return default fees with 0 values when no swap
        const zeroSrcAmount = {
            token: props.inputToken,
            amount: '0',
            rawAmount: BigInt(0),
            _amount: BigInt(0),
            usdValue: async () => 0,
        };
        return [
            {
                text: 'Swap fee',
                fee: {
                    amountInSrcToken: zeroSrcAmount,
                    amountInDstToken: null,
                    usdValue: async () => 0,
                },
                usdValue: 0,
            },
        ];
    }, [swapFees, props.inputToken, props.outputToken]);
    const inputToken = props.swap?.getInput()?.token ?? props.inputToken;
    const outputToken = props.swap?.getOutput()?.token ?? props.outputToken;
    const inputTokenUsdPrice = usePricing('1', inputToken);
    const outputTokenUsdPrice = usePricing('1', outputToken);
    const calculatedSwapPrice = useMemo(() => {
        if (!inputTokenUsdPrice || !outputTokenUsdPrice || inputTokenUsdPrice === 0)
            return null;
        return outputTokenUsdPrice / inputTokenUsdPrice;
    }, [inputTokenUsdPrice, outputTokenUsdPrice]);
    const { totalQuoteTime, quoteTimeRemaining, state } = useSwapState(props.swap);
    const isExpired = useMemo(() => props.swap?.isQuoteSoftExpired() || props.swap?.isQuoteExpired(), [state]);
    return (_jsx(_Fragment, { children: _jsx(Accordion, { className: "simple-fee-screen", children: _jsxs(Accordion.Item, { eventKey: "0", className: "tab-accent-nop", children: [_jsxs(Accordion.Header, { className: "font-bigger d-flex flex-row", bsPrefix: "fee-accordion-header", children: [_jsxs("div", { className: "simple-fee-screen__quote", children: [_jsx("div", { className: "sc-text", children: isExpired ? (_jsxs("span", { className: "simple-fee-screen__quote__error", children: [_jsx("span", { className: "icon icon-invalid-error" }), _jsx("span", { className: "sc-text", children: "Quote expired" })] })) : !outputToken || !inputToken ? (_jsx("div", { className: "simple-fee-screen__skeleton" })) : !props.swap ? (_jsxs(_Fragment, { children: ["1 ", outputToken.ticker, " =", ' ', calculatedSwapPrice != null
                                                    ? calculatedSwapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals)
                                                    : '-', ' ', inputToken.ticker] })) : (_jsxs(_Fragment, { children: ["1 ", outputToken.ticker, " =", ' ', props.swap
                                                    .getPriceInfo()
                                                    .swapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals), ' ', inputToken.ticker] })) }), _jsx(SwapExpiryProgressCircle, { expired: isExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: props.swap != null, onRefreshQuote: props.onRefreshQuote })] }), _jsx("div", { className: "icon icon-receipt-fees" }), _jsx("span", { className: "simple-fee-screen__fee", children: totalUsdFee == null ? (props.swap == null ? ('$0.00') : (_jsx("div", { className: "simple-fee-screen__skeleton" }))) : ('$' + totalUsdFee.toFixed(2)) }), _jsx("div", { className: "icon icon-caret-down" })] }), _jsx(Accordion.Body, { className: "simple-fee-screen__body", children: fees.map((e, index) => (_jsx(FeePart, { ...e }, index))) })] }) }) }));
}
