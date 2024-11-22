import {Alert, Button} from "react-bootstrap";
import * as React from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {ISwap, Tokens} from "@atomiqlabs/sdk";
import {useMemo} from "react";
import * as BN from "bn.js";
import {toHumanReadableString} from "../utils/Currencies";

const swapMinimum = new BN(1000000);

export function SwapForGasAlert(props: {
    notEnoughForGas: BN,
    quote: ISwap
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const feeNeeded: {rawAmount: BN, amount: string} = useMemo(() => {
        if(props.notEnoughForGas==null) return null;
        const amount = BN.max(props.notEnoughForGas, swapMinimum);
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, Tokens.SOLANA.SOL)
        }
    }, [props.notEnoughForGas]);

    return (
        <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={!!props.notEnoughForGas} variant="danger" closeVariant="white">
            <strong>Not enough SOL for fees</strong>
            <label>You need at least {feeNeeded?.amount} more SOL to pay for fees and refundable deposit! You can use <b>Bitcoin Lightning</b> to swap for gas first & then continue swapping here!</label>
            <Button className="mt-2" variant="secondary" onClick={() => {
                navigate("/gas", {
                    state: {
                        returnPath: location.pathname+location.search,
                        chainId: props.quote.chainIdentifier,
                        amount: feeNeeded?.rawAmount.toString(10)
                    }
                });
            }}>Swap for gas</Button>
        </Alert>
    );
}
