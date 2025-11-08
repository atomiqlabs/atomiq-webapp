import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { getDeltaText } from '../../utils/Utils';
import { FEConstants } from '../../FEConstants';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
export function SwapConfirmations(props) {
    // State 1: Confirming - Transaction received, waiting for confirmations
    if (props.txData && !props.isClaimable) {
        const { txId, confirmations, confTarget, txEtaMs } = props.txData;
        return (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__name", children: "Transaction received, waiting for confirmations..." }), _jsxs("div", { className: "swap-confirmations__estimate", children: [_jsx(Spinner, {}), _jsxs("div", { className: "swap-confirmations__estimate__info", children: [_jsxs("div", { className: "swap-confirmations__estimate__item", children: [confirmations, " / ", confTarget, " Confirmations"] }), _jsxs("div", { className: "swap-confirmations__estimate__item is-eta", children: ["ETA:", ' ', txEtaMs === -1 || txEtaMs > 60 * 60 * 1000
                                            ? '>1 hour'
                                            : '~' + getDeltaText(txEtaMs, true)] })] })] }), _jsxs("a", { href: FEConstants.btcBlockExplorer + txId, target: "_blank", className: "swap-confirmations__link", children: [_jsx("div", { className: "sc-text", children: "View transaction" }), _jsx("div", { className: "icon icon-new-window" })] })] }));
    }
    // State 2: Confirmed - Transaction confirmed, waiting for watchtowers
    if (props.isClaimable && !props.claimable) {
        return (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__estimate", children: _jsx(Spinner, {}) }), _jsx("div", { className: "swap-confirmations__name", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] }));
    }
    // State 3: Claimable - Ready to claim manually
    if (props.isClaimable && props.claimable) {
        return (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__name", children: "Transaction received & confirmed, you can claim your funds manually now!" }), props.claimError && (_jsx(ErrorAlert, { className: "mb-3", title: "Claim error", error: props.claimError })), _jsxs(ButtonWithWallet, { chainId: props.chainId, onClick: props.onClaim, disabled: props.claimLoading, size: "lg", children: [props.claimLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', "Finish swap (claim funds)"] })] }));
    }
    return null;
}
