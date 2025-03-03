import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SwapType, toHumanReadableString } from "@atomiqlabs/sdk";
import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getFeePct } from "../../utils/Utils";
import { TokenIcon } from "../TokenIcon";
function FeePart(props) {
    return (_jsxs("div", { className: "d-flex my-2", children: [_jsxs("span", { className: "d-flex align-items-center", children: [props.text, props.feePPM == null ? "" : props.feeBase == null ? (_jsxs(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: [Number(props.feePPM) / 10000, " %"] })) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, children: _jsxs("span", { children: [Number(props.feePPM) / 10000, "% + ", toHumanReadableString(props.feeBase, props.feeCurrency), " ", props.feeCurrency.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "dottedUnderline", children: [Number(props.feePPM) / 10000, "%"] }) }) })), props.description != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-desc-" + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsx("span", { className: "dottedUnderline", children: "?" }) }) })) : ""] }), _jsxs("span", { className: "ms-auto", children: [props.isApproximate ? "~" : "", props.amount.amount, " ", props.amount.token.ticker] })] }));
}
export function FeeSummaryScreen(props) {
    let className = props.className;
    if (props.swap == null)
        return null;
    if (props.swap.getType() === SwapType.TO_BTC || props.swap.getType() === SwapType.TO_BTCLN) {
        const input = props.swap.getInput();
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", amount: props.swap.getInputWithoutFee() }), _jsx(FeePart, { text: "Swap fee", amount: props.swap.getSwapFee().amountInSrcToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: props.swap.getOutput().token }), _jsx(FeePart, { text: "Network fee", amount: props.swap.getNetworkFee().amountInSrcToken, description: props.swap.getType() === SwapType.TO_BTC ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network" }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: input.token, className: "currency-icon-small" }), input.amount, " ", input.token.ticker] })] })] }));
    }
    if (props.swap.getType() === SwapType.FROM_BTC) {
        const output = props.swap.getOutput();
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", amount: props.swap.getOutputWithoutFee() }), _jsx(FeePart, { text: "Swap fee", amount: props.swap.getFee().amountInDstToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: props.swap.getInput().token }), _jsx(FeePart, { text: "Watchtower fee", amount: props.swap.getClaimerBounty(), description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms." }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: output.token, className: "currency-icon-small" }), output.amount, " ", output.token.ticker] })] })] }));
    }
    if (props.swap.getType() === SwapType.FROM_BTCLN) {
        const output = props.swap.getOutput();
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", amount: props.swap.getOutputWithoutFee() }), _jsx(FeePart, { text: "Swap fee", amount: props.swap.getFee().amountInDstToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: props.swap.getInput().token }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: output.token, className: "currency-icon-small" }), output.amount, " ", output.token.ticker] })] })] }));
    }
    return null;
}
