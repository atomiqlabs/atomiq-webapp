import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SwapTopbar } from "../components/SwapTopbar";
import { Alert, Badge, Button, Card, Col, ListGroup, Spinner } from "react-bootstrap";
import { FromBTCSwapState, FromBTCLNSwap, FromBTCSwap, IFromBTCSwap, IToBTCSwap, SwapType } from "@atomiqlabs/sdk";
import { useContext, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useNavigate } from "react-router-dom";
import { TokenIcon } from "../components/TokenIcon";
//TODO: Requires completion for multiple signers
function HistoryEntry(props) {
    const [loading, setLoading] = useState(false);
    const { removeSwap, getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.swap);
    const navigate = useNavigate();
    const input = props.swap.getInput();
    const output = props.swap.getOutput();
    if (props.swap instanceof IToBTCSwap) {
        const refund = async () => {
            setLoading(true);
            props.onError(null);
            try {
                await props.swap.refund(signer);
                removeSwap(props.swap);
            }
            catch (e) {
                props.onError(e.toString());
            }
            setLoading(false);
        };
        return (_jsxs(ListGroup.Item, { as: "li", className: "text-start d-flex flex-row", children: [_jsxs(Col, { children: [_jsxs("div", { children: [_jsx("b", { children: "Swap" }), _jsx(Badge, { bg: "danger", className: "ms-2", children: "Failed (refundable)" })] }), _jsxs("small", { children: [_jsx(TokenIcon, { tokenOrTicker: input.token, className: "currency-icon-history me-1" }), input.amount, " -", ">", " ", _jsx(TokenIcon, { tokenOrTicker: output.token, className: "currency-icon-history me-1" }), output.amount] })] }), _jsx(Col, { xs: 3, className: "d-flex", children: _jsxs(Button, { disabled: loading, onClick: refund, variant: "outline-primary", className: "px-1 flex-fill", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Refund"] }) })] }));
    }
    else if (props.swap instanceof IFromBTCSwap) {
        const shouldContinue = props.swap instanceof FromBTCSwap && props.swap.getState() === FromBTCSwapState.CLAIM_COMMITED;
        const claim = async () => {
            setLoading(true);
            props.onError(null);
            try {
                if (props.swap instanceof FromBTCSwap) {
                    await props.swap.claim(signer);
                }
                else if (props.swap instanceof FromBTCLNSwap) {
                    await props.swap.commitAndClaim(signer);
                }
                removeSwap(props.swap);
            }
            catch (e) {
                props.onError(e.toString());
            }
            setLoading(false);
        };
        const cont = () => {
            navigate("/?swapId=" + props.swap.getPaymentHash().toString("hex"));
        };
        return (_jsxs(Card, { className: "text-start d-flex flex-row tab-bg text-white border-0 p-3 my-2", children: [_jsxs(Col, { children: [_jsxs("div", { children: [_jsx("b", { children: "Swap" }), _jsx(Badge, { bg: shouldContinue ? "primary" : "success", className: "ms-2", children: shouldContinue ? "Open" : "Claimable" })] }), _jsxs("small", { children: [_jsx(TokenIcon, { tokenOrTicker: input.token, className: "currency-icon-history me-1" }), input.amount, " -", ">", " ", _jsx(TokenIcon, { tokenOrTicker: output.token, className: "currency-icon-history me-1" }), output.amount] })] }), _jsx(Col, { xs: 3, className: "d-flex", children: _jsxs(Button, { disabled: loading, onClick: shouldContinue ? cont : claim, variant: "light", className: "px-1 flex-fill", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", shouldContinue ? "Continue" : "Claim"] }) })] }));
    }
}
export function History() {
    const [error, setError] = useState();
    const { actionableSwaps } = useContext(SwapsContext);
    const entries = [];
    for (let actionableSwap of actionableSwaps) {
        let shouldAdd = false;
        if (actionableSwap.getType() === SwapType.TO_BTC || actionableSwap.getType() === SwapType.TO_BTCLN) {
            shouldAdd = actionableSwap.isRefundable();
        }
        if (actionableSwap.getType() === SwapType.FROM_BTC || actionableSwap.getType() === SwapType.FROM_BTCLN) {
            shouldAdd = actionableSwap.isClaimable();
        }
        if (shouldAdd)
            entries.push(_jsx(HistoryEntry, { swap: actionableSwap, onError: setError }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 2, enabled: true }), _jsxs("div", { className: "d-flex flex-column flex-fill align-items-center text-white mt-n2", children: [error == null ? "" : (_jsxs(Alert, { variant: "danger", className: "mb-2", children: [_jsx("div", { children: _jsx("b", { children: "Action failed" }) }), error] })), _jsx("div", { className: "swap-panel", children: entries })] })] }));
}
