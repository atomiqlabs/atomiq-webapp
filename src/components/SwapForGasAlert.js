import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { Tokens } from "@atomiqlabs/sdk";
import { useMemo } from "react";
import * as BN from "bn.js";
import { toHumanReadableString } from "../utils/Currencies";
const swapMinimum = new BN(1000000);
export function SwapForGasAlert(props) {
    const location = useLocation();
    const navigate = useNavigate();
    const feeNeeded = useMemo(() => {
        if (props.notEnoughForGas == null)
            return null;
        const amount = BN.max(props.notEnoughForGas, swapMinimum);
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, Tokens.SOLANA.SOL)
        };
    }, [props.notEnoughForGas]);
    return (_jsxs(Alert, { className: "text-center mb-3 d-flex align-items-center flex-column", show: !!props.notEnoughForGas, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough SOL for fees" }), _jsxs("label", { children: ["You need at least ", feeNeeded?.amount, " more SOL to pay for fees and refundable deposit! You can use ", _jsx("b", { children: "Bitcoin Lightning" }), " to swap for gas first & then continue swapping here!"] }), _jsx(Button, { className: "mt-2", variant: "secondary", onClick: () => {
                    navigate("/gas", {
                        state: {
                            returnPath: location.pathname + location.search,
                            chainId: props.quote.chainIdentifier,
                            amount: feeNeeded?.rawAmount.toString(10)
                        }
                    });
                }, children: "Swap for gas" })] }));
}
