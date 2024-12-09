import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button } from "react-bootstrap";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SwapDirection, Tokens } from "@atomiqlabs/sdk";
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
                    const params = new URLSearchParams();
                    params.set("swapType", props.quote.getType().toString());
                    const direction = props.quote.getDirection();
                    const token = (direction === SwapDirection.TO_BTC ? props.quote.getInput().token : props.quote.getOutput().token);
                    params.set("chainId", token.chainId);
                    params.set("token", token.ticker);
                    params.set("exactIn", "" + props.quote.exactIn);
                    params.set("amount", props.quote.exactIn ? props.quote.getInput().amount : props.quote.getOutput().amount);
                    navigate("/gas", {
                        state: {
                            returnPath: location.pathname + "?" + params.toString(),
                            chainId: props.quote.chainIdentifier,
                            amount: feeNeeded?.rawAmount.toString(10)
                        }
                    });
                }, children: "Swap for gas" })] }));
}
