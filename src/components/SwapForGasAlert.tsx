import {Alert, Button} from "react-bootstrap";
import * as React from "react";
import {useContext, useMemo} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {ISwap, SCToken, SwapDirection, toHumanReadableString} from "@atomiqlabs/sdk";
import * as BN from "bn.js";
import {SwapsContext} from "../context/SwapsContext";

const swapMinimum = new BN(1000000);

export function SwapForGasAlert(props: {
    notEnoughForGas: BN,
    quote: ISwap
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const {swapper} = useContext(SwapsContext);

    const feeNeeded = useMemo(() => {
        if(props.notEnoughForGas==null || props.quote==null || swapper==null) return null;
        const nativeToken = swapper.getNativeToken(props.quote.chainIdentifier);
        const amount = BN.max(props.notEnoughForGas, swapMinimum);
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, nativeToken),
            nativeToken
        }
    }, [props.notEnoughForGas, props.quote, swapper]);

    return (
        <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={!!props.notEnoughForGas} variant="danger" closeVariant="white">
            <strong>Not enough {feeNeeded?.nativeToken?.ticker} for fees</strong>
            <label>You need at least {feeNeeded?.amount} more {feeNeeded?.nativeToken?.ticker} to pay for fees and refundable deposit! You can use <b>Bitcoin Lightning</b> to swap for gas first & then continue swapping here!</label>
            <Button className="mt-2" variant="secondary" onClick={() => {
                const params = new URLSearchParams();
                params.set("swapType", props.quote.getType().toString());
                const direction = props.quote.getDirection();
                const token = (direction===SwapDirection.TO_BTC ? props.quote.getInput().token : props.quote.getOutput().token) as SCToken;
                params.set("chainId", token.chainId);
                params.set("token", token.ticker);
                params.set("exactIn", ""+props.quote.exactIn);
                params.set("amount", props.quote.exactIn ? props.quote.getInput().amount : props.quote.getOutput().amount);
                navigate("/gas", {
                    state: {
                        returnPath: location.pathname+"?"+params.toString(),
                        chainId: props.quote.chainIdentifier,
                        amount: feeNeeded?.rawAmount.toString(10)
                    }
                });
            }}>Swap for gas</Button>
        </Alert>
    );
}
