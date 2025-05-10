import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SwapDirection, toHumanReadableString } from "@atomiqlabs/sdk";
import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { TokenIcon } from "../tokens/TokenIcon";
import { useSwapFees } from "./hooks/useSwapFees";
function FeePart(props) {
    return (_jsxs("div", { className: "d-flex my-2", children: [_jsxs("span", { className: "d-flex align-items-center", children: [props.text, props.composition == null ? "" : props.composition.base == null ? (_jsxs(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: [props.composition.percentage.percentage, " %"] })) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, children: _jsxs("span", { children: [props.composition.percentage.percentage, "% + ", props.composition.base.amount, " ", props.composition.base.token.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "dottedUnderline", children: [props.composition.percentage.percentage, "%"] }) }) })), props.description != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-desc-" + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsx("span", { className: "dottedUnderline", children: "?" }) }) })) : ""] }), _jsxs("span", { className: "ms-auto", children: [props.isApproximate ? "~" : "", toHumanReadableString(props.amount, props.token), " ", props.token.ticker] })] }));
}
export function FeeSummaryScreen(props) {
    let className = props.className;
    let amount;
    let total;
    let token;
    if (props.swap.getDirection() === SwapDirection.TO_BTC) {
        amount = props.swap.getInputWithoutFee().rawAmount;
        total = props.swap.getInput().rawAmount;
        token = props.swap.getInput().token;
    }
    else {
        total = props.swap.getOutput().rawAmount;
        amount = total + props.swap.getFee().amountInDstToken.rawAmount;
        token = props.swap.getOutput().token;
    }
    const { fees } = useSwapFees(props.swap, undefined, false);
    if (props.swap == null)
        return null;
    return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", amount: amount, token: token }), fees.map(val => {
                if (val.fee.amountInDstToken == null || val.fee.amountInSrcToken.token === token) {
                    return (_jsx(FeePart, { text: val.text, description: val.description, amount: val.fee.amountInSrcToken.rawAmount, token: val.fee.amountInSrcToken.token, composition: val.composition }));
                }
                else if (val.fee.amountInDstToken.token === token) {
                    return (_jsx(FeePart, { text: val.text, description: val.description, amount: val.fee.amountInDstToken.rawAmount, token: val.fee.amountInDstToken.token, composition: val.composition }));
                }
            }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: token, className: "currency-icon-small" }), toHumanReadableString(total, token), " ", token.ticker] })] })] }));
}
