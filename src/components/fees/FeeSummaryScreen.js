import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { FromBTCLNSwap, FromBTCSwap, IToBTCSwap, ToBTCSwap } from "sollightning-sdk";
import { getCurrencySpec, getNativeCurrency, toHumanReadableString } from "../../utils/Currencies";
import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { getFeePct } from "../../utils/Utils";
function FeePart(props) {
    return (_jsxs("div", { className: "d-flex my-2", children: [_jsxs("span", { className: "d-flex align-items-center", children: [props.text, props.feePPM == null ? "" : props.feeBase == null ? (_jsxs(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: [props.feePPM.toNumber() / 10000, " %"] })) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, children: _jsxs("span", { children: [props.feePPM.toNumber() / 10000, "% + ", toHumanReadableString(props.feeBase, props.feeCurrency), " ", props.feeCurrency.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "dottedUnderline", children: [props.feePPM.toNumber() / 10000, "%"] }) }) })), props.description != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-desc-" + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsx("span", { className: "dottedUnderline", children: "?" }) }) })) : ""] }), _jsxs("span", { className: "ms-auto", children: [props.isApproximate ? "~" : "", toHumanReadableString(props.amount, props.currency), " ", props.currency.ticker] })] }));
}
export function FeeSummaryScreen(props) {
    let className = props.className;
    if (props.swap instanceof IToBTCSwap) {
        const currency = getCurrencySpec(props.swap.getInToken());
        const btcCurrency = getCurrencySpec(props.swap.getOutToken());
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", currency: currency, amount: props.swap.getInAmountWithoutFee() }), _jsx(FeePart, { text: "Swap fee", currency: currency, amount: props.swap.getSwapFee().amountInSrcToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: btcCurrency }), _jsx(FeePart, { text: "Network fee", currency: currency, amount: props.swap.getNetworkFee().amountInSrcToken, description: props.swap instanceof ToBTCSwap ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network" }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx("img", { src: currency.icon, className: "currency-icon-small" }), toHumanReadableString(props.swap.getInAmount(), currency), " ", currency.ticker] })] })] }));
    }
    const currency = getCurrencySpec(props.swap.getOutToken());
    const btcCurrency = getCurrencySpec(props.swap.getInToken());
    if (props.swap instanceof FromBTCSwap) {
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", currency: currency, amount: props.swap.getOutAmount().add(props.swap.getFee().amountInDstToken) }), _jsx(FeePart, { text: "Swap fee", currency: currency, amount: props.swap.getFee().amountInDstToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: btcCurrency }), _jsx(FeePart, { text: "Watchtower fee", currency: getNativeCurrency(), amount: props.swap.getClaimerBounty(), description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms." }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx("img", { src: currency.icon, className: "currency-icon-small" }), toHumanReadableString(props.swap.getOutAmount(), currency), " ", currency.ticker] })] })] }));
    }
    if (props.swap instanceof FromBTCLNSwap) {
        return (_jsxs("div", { className: className, children: [_jsx(FeePart, { text: "Amount", currency: currency, amount: props.swap.getOutAmount().add(props.swap.getFee().amountInDstToken) }), _jsx(FeePart, { text: "Swap fee", currency: currency, amount: props.swap.getFee().amountInDstToken, feePPM: getFeePct(props.swap, 1), feeBase: props.swap.pricingInfo.satsBaseFee, feeCurrency: btcCurrency }), _jsxs("div", { className: "d-flex fw-bold border-top border-light font-bigger", children: [_jsx("span", { children: "Total:" }), _jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx("img", { src: currency.icon, className: "currency-icon-small" }), toHumanReadableString(props.swap.getOutAmount(), currency), " ", currency.ticker] })] })] }));
    }
    return null;
}
