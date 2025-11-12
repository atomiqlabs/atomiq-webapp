import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { FEConstants } from '../../FEConstants';
export function SwapConfirmations(props) {
    if (!props.txData)
        return null;
    return (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__name", children: "Transaction received, waiting for confirmations..." }), _jsxs("div", { className: "swap-confirmations__estimate", children: [_jsx(Spinner, {}), _jsxs("div", { className: "swap-confirmations__estimate__info", children: [_jsxs("div", { className: "swap-confirmations__estimate__item", children: [props.txData.confirmations.actual, " / ", props.txData.confirmations.required, " Confirmations"] }), _jsxs("div", { className: "swap-confirmations__estimate__item is-eta", children: ["ETA: ", props.txData.eta.text] })] })] }), _jsxs("a", { href: FEConstants.btcBlockExplorer + props.txData.txId, target: "_blank", className: "swap-confirmations__link", children: [_jsx("div", { className: "sc-text", children: "View transaction" }), _jsx("div", { className: "icon icon-new-window" })] })] }));
}
