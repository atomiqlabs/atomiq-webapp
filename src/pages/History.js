import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SwapTopbar } from "./SwapTopbar";
import { Badge, Button, Col, Row } from "react-bootstrap";
import { isSCToken, IToBTCSwap, SwapDirection, SwapType } from "@atomiqlabs/sdk";
import { useContext, useEffect, useState } from "react";
import { SwapsContext } from "../swaps/context/SwapsContext";
import { useNavigate } from "react-router-dom";
import { TokenIcon } from "../tokens/TokenIcon";
import { SingleColumnStaticTable } from "../table/SingleColumnTable";
import { FEConstants } from "../FEConstants";
import { getTimeDeltaText } from "../utils/Utils";
import Icon from "react-icons-kit";
import { ic_arrow_forward } from 'react-icons-kit/md/ic_arrow_forward';
import { ic_arrow_downward } from 'react-icons-kit/md/ic_arrow_downward';
function HistoryEntry(props) {
    const navigate = useNavigate();
    const input = props.swap.getInput();
    const output = props.swap.getOutput();
    const inputExplorer = isSCToken(input.token) ? FEConstants.blockExplorers[input.token.chainId] : !input.token.lightning ? FEConstants.btcBlockExplorer : null;
    const outputExplorer = isSCToken(output.token) ? FEConstants.blockExplorers[output.token.chainId] : !output.token.lightning ? FEConstants.btcBlockExplorer : null;
    const txIdInput = props.swap.getInputTxId();
    const txIdOutput = props.swap.getOutputTxId();
    const inputAddress = props.swap instanceof IToBTCSwap ? props.swap._getInitiator() : "";
    const outputAddress = props.swap.getOutputAddress();
    const refundable = props.swap.getDirection() === SwapDirection.TO_BTC && props.swap.isRefundable();
    const claimable = props.swap.getDirection() === SwapDirection.FROM_BTC && props.swap.isClaimable();
    const navigateToSwap = (event) => {
        event.preventDefault();
        navigate("/?swapId=" + props.swap.getId());
    };
    const badge = props.swap.isSuccessful() ? (_jsx(Badge, { bg: "success", className: "width-fill", children: "Success" })) : props.swap.isFailed() ? (_jsx(Badge, { bg: "danger", className: "width-fill", children: "Failed" })) : props.swap.isQuoteSoftExpired() ? (_jsx(Badge, { bg: "danger", className: "width-fill", children: "Quote expired" })) : refundable ? (_jsx(Badge, { bg: "warning", className: "width-fill", children: "Refundable" })) : claimable ? (_jsx(Badge, { bg: "warning", className: "width-fill", children: "Claimable" })) : (_jsx(Badge, { bg: "primary", className: "width-fill", children: "Pending" }));
    return (_jsxs(Row, { className: "d-flex flex-row gx-1 gy-1", children: [_jsx(Col, { xs: 12, className: "d-md-none text-end", children: _jsxs(Row, { className: "gx-1 gy-0 width-fill", children: [_jsx(Col, { xs: 6, children: badge }), _jsx(Col, { xs: 6, children: _jsxs("small", { className: "", children: [getTimeDeltaText(props.swap.createdAt), " ago"] }) })] }) }), _jsx(Col, { md: 10, sm: 12, className: "d-flex", children: _jsx("div", { className: "card border-0 bg-transparent p-2 width-fill container-fluid", children: _jsxs(Row, { className: "", children: [_jsxs(Col, { md: 6, xs: 12, className: "d-flex flex-row align-items-center", children: [_jsxs("div", { className: "min-width-0 me-md-2", children: [_jsx("a", { className: "font-small single-line-ellipsis", target: "_blank", href: inputExplorer == null || txIdInput == null ? null : inputExplorer + txIdInput, children: txIdInput || "None" }), _jsxs("span", { className: "d-flex align-items-center font-weight-500 my-1", children: [_jsx(TokenIcon, { tokenOrTicker: input.token, className: "currency-icon-medium" }), input.amount, " ", input.token.ticker || "???"] }), _jsx("small", { className: "single-line-ellipsis", children: inputAddress })] }), _jsx(Icon, { size: 22, icon: ic_arrow_forward, className: "d-md-block d-none", style: {
                                            marginLeft: "auto",
                                            marginRight: "-22px",
                                            marginBottom: "6px"
                                        } })] }), _jsx(Col, { md: 0, xs: 12, className: "d-md-none d-flex justify-content-center", children: _jsx(Icon, { size: 22, icon: ic_arrow_downward, className: "", style: { marginBottom: "6px" } }) }), _jsxs(Col, { md: 6, xs: 12, className: "ps-md-4", children: [_jsx("a", { className: "font-small single-line-ellipsis", target: "_blank", href: outputExplorer == null || txIdOutput == null ? null : outputExplorer + txIdOutput, children: txIdOutput || "..." }), _jsxs("span", { className: "d-flex align-items-center font-weight-500 my-1", children: [_jsx(TokenIcon, { tokenOrTicker: output.token, className: "currency-icon-medium" }), output.amount, " ", output.token.ticker || "???"] }), _jsx("small", { className: "single-line-ellipsis", children: outputAddress })] })] }) }) }), _jsxs(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column", children: [_jsx("div", { className: "d-none d-md-block", children: _jsxs("small", { className: "", children: [getTimeDeltaText(props.swap.createdAt), " ago"] }) }), _jsx("div", { className: "d-none d-md-block mb-1", children: badge }), _jsx(Button, { variant: claimable || refundable ? "primary" : "secondary", size: "sm", href: "/?swapId=" + props.swap.getId(), className: "width-fill", onClick: navigateToSwap, children: refundable ? "Refund" : claimable ? "Claim" : "View" })] })] }));
}
export function History() {
    const { swapper } = useContext(SwapsContext);
    const [swaps, setSwaps] = useState([]);
    useEffect(() => {
        if (swapper == null)
            return;
        swapper.getAllSwaps().then(swaps => {
            setSwaps(swaps.filter(swap => swap.isInitiated() &&
                swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
                swap.getType() !== SwapType.TRUSTED_FROM_BTCLN).sort((a, b) => {
                const _a = a.requiresAction();
                const _b = b.requiresAction();
                if (_a === _b)
                    return b.createdAt - a.createdAt;
                if (_a)
                    return -1;
                if (_b)
                    return 1;
            }));
        });
        const listener = (swap) => {
            if (!swap.isInitiated())
                return;
            if (swap.getType() === SwapType.TRUSTED_FROM_BTC || swap.getType() === SwapType.TRUSTED_FROM_BTCLN)
                return;
            setSwaps(swaps => {
                if (swaps.includes(swap))
                    return [...swaps];
                return [swap, ...swaps];
            });
        };
        swapper.on("swapState", listener);
        return () => {
            swapper.off("swapState", listener);
            setSwaps([]);
            console.log("History: Set swaps to []");
        };
    }, [swapper]);
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 2, enabled: true }), _jsx("div", { className: "flex-fill text-white container text-start", children: _jsx(SingleColumnStaticTable, { column: {
                        renderer: (row) => {
                            return _jsx(HistoryEntry, { swap: row });
                        }
                    }, data: swaps, itemsPerPage: 10 }) })] }));
}
