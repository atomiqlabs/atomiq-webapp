import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ToBTCSwapState, FromBTCSwapState, SwapType, FromBTCLNSwapState, } from '@atomiqlabs/sdk';
import { Accordion, Badge, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { useMemo } from 'react';
import { TokenIcon } from '../tokens/TokenIcon';
import { useSwapFees } from './hooks/useSwapFees';
import { SwapExpiryProgressBar } from '../swaps/components/SwapExpiryProgressBar';
import { useSwapState } from '../swaps/hooks/useSwapState';
function FeePart(props) {
    return (_jsxs("div", { className: 'd-flex font-medium ' + props.className, children: [_jsxs("small", { className: "d-flex align-items-center", children: [props.description == null ? (props.text) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'fee-tooltip-desc-' + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx("span", { className: "dottedUnderline", children: props.text }) })), props.composition == null ? ('') : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'fee-tooltip-' + props.text, children: _jsxs("span", { children: [(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1), "% +", ' ', props.composition.base.amount, " ", props.composition.base.token.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "text-decoration-dotted", children: [(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1), "%"] }) }) }))] }), _jsx("span", { className: "ms-auto fw-bold d-flex align-items-center", children: _jsx(OverlayTrigger, { placement: "left", overlay: _jsx(Tooltip, { id: 'fee-tooltip-' + props.text, className: "font-default", children: props.fee.amountInDstToken == null ? (_jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: '-2px' } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] })) : (_jsxs("span", { className: "ms-auto text-end", children: [_jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: '-1px' } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] }), _jsx("span", { className: "d-flex align-items-center justify-content-center fw-bold", children: "=" }), _jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInDstToken.token, className: "currency-icon-small" }), _jsxs("span", { children: [props.fee.amountInDstToken.amount, " ", props.fee.amountInDstToken.token.ticker] })] })] })) }), children: _jsxs("span", { className: "text-decoration-dotted font-monospace", children: ["$", (props.usdValue == null ? 0 : props.usdValue).toFixed(2)] }) }) })] }));
}
export function SimpleFeeSummaryScreen(props) {
    const { fees, totalUsdFee } = useSwapFees(props.swap, props.btcFeeRate);
    const inputToken = props.swap?.getInput().token;
    const outputToken = props.swap?.getOutput().token;
    const { totalQuoteTime, quoteTimeRemaining, state } = useSwapState(props.swap);
    const swapType = props.swap?.getType();
    const [isCreated, isExpired] = useMemo(() => {
        if (swapType === SwapType.TO_BTC || swapType === SwapType.TO_BTCLN) {
            return [
                state === ToBTCSwapState.CREATED || state === ToBTCSwapState.QUOTE_SOFT_EXPIRED,
                state === ToBTCSwapState.QUOTE_EXPIRED || state === ToBTCSwapState.QUOTE_SOFT_EXPIRED,
            ];
        }
        else if (swapType === SwapType.FROM_BTC) {
            return [
                state === FromBTCSwapState.PR_CREATED || state === FromBTCSwapState.QUOTE_SOFT_EXPIRED,
                state === FromBTCSwapState.QUOTE_EXPIRED || state === FromBTCSwapState.QUOTE_SOFT_EXPIRED,
            ];
        }
        else if (swapType === SwapType.FROM_BTCLN) {
            return [
                state === FromBTCLNSwapState.PR_CREATED || state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED,
                state === FromBTCLNSwapState.QUOTE_EXPIRED ||
                    state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED,
            ];
        }
        // For other swap types, default to false
        return [false, false];
    }, [state, swapType]);
    return (_jsx(_Fragment, { children: _jsx(Accordion, { className: "simple-fee-screen", children: _jsxs(Accordion.Item, { eventKey: "0", className: "tab-accent-nop", children: [_jsxs(Accordion.Header, { className: "font-bigger d-flex flex-row", bsPrefix: "fee-accordion-header", children: [_jsxs("div", { className: "simple-fee-screen__quote", children: [_jsxs("div", { className: "sc-text", children: ["1 ", outputToken.ticker, " =", ' ', props.swap
                                                .getPriceInfo()
                                                .swapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals), ' ', inputToken.ticker] }), _jsx(SwapExpiryProgressBar, { expired: isExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: isCreated || isExpired, expiryText: "Quote expired!" })] }), _jsx("div", { className: "icon icon-receipt-fees" }), _jsx("span", { className: "simple-fee-screen__fee", children: totalUsdFee == null ? (_jsx(Spinner, { animation: "border", size: "sm" })) : ('$' + totalUsdFee.toFixed(2)) }), _jsx("div", { className: "icon icon-caret-down" })] }), _jsx(Accordion.Body, { className: "simple-fee-screen__body", children: fees.map((e, index) => (_jsx(FeePart, { ...e }, index))) })] }) }) }));
}
