import * as React from "react";
import {useContext, useEffect} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCLNSwapState} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";
import {useSwapState} from "../../../utils/useSwapState";
import {useAsync} from "../../../utils/useAsync";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";
import * as BN from "bn.js";

export function LNURLWithdrawQuoteSummary(props: {
    quote: FromBTCLNSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    autoContinue?: boolean,
    notEnoughForGas: BN
}) {
    const {getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const {state, totalQuoteTime, quoteTimeRemaining} = useSwapState(props.quote);

    useEffect(() => {
        if(state===FromBTCLNSwapState.PR_CREATED) {
            if(props.autoContinue) onContinue(true);
        }
    }, [state]);

    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync(async (skipChecks?: boolean) => {
        props.setAmountLock(true);
        if(props.quote.getState()===FromBTCLNSwapState.CLAIM_COMMITED) {
            await props.quote.commitAndClaim(signer, null, skipChecks);
            return true;
        }
        if (!props.quote.prPosted) {
            await props.quote.waitForPayment(null, 1);
            await props.quote.commitAndClaim(signer, null, skipChecks);
        }
        return true;
    }, [props.quote, signer]);

    useEffect(() => {
        if(continueSuccess!=null || continueError!=null) {
            if(props.setAmountLock!=null) props.setAmountLock(false);
        }
    }, [continueSuccess, continueError]);

    return (
        <>
            <SwapExpiryProgressBar
                expired={state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED || state===FromBTCLNSwapState.QUOTE_EXPIRED}
                timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                show={(
                    state===FromBTCLNSwapState.PR_CREATED ||
                    state===FromBTCLNSwapState.PR_PAID ||
                    state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED ||
                    state===FromBTCLNSwapState.QUOTE_EXPIRED
                ) && !continueLoading && signer!==undefined}
            />

            {(
                state===FromBTCLNSwapState.PR_CREATED ||
                state===FromBTCLNSwapState.PR_PAID ||
                (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && continueLoading) ||
                state===FromBTCLNSwapState.CLAIM_COMMITED
            ) ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <Alert className="text-center mb-3" show={continueError!=null} variant="danger" closeVariant="white">
                            <strong>Swap claim error</strong>
                            <label>{continueError?.message}</label>
                        </Alert>

                        <ButtonWithSigner signer={signer} chainId={props.quote.chainIdentifier} onClick={() => onContinue()} disabled={continueLoading} size="lg">
                            {continueLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Claim
                        </ButtonWithSigner>
                    </>
                )
            ) : ""}

            {state===FromBTCLNSwapState.CLAIM_CLAIMED ? (
                <Alert variant="success" className="mb-0">
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                </Alert>
            ) : ""}

            {(
                state === FromBTCLNSwapState.FAILED ||
                state === FromBTCLNSwapState.EXPIRED
            ) ? (
                <Alert variant="danger" className="mb-0">
                    <strong>Swap failed</strong>
                    <label>Swap HTLC expired, your lightning payment will be refunded shortly!</label>
                </Alert>
            ) : ""}

            {(
                state === FromBTCLNSwapState.QUOTE_EXPIRED ||
                (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !continueLoading) ||
                state===FromBTCLNSwapState.EXPIRED ||
                state===FromBTCLNSwapState.FAILED
            ) ? (
                <Button onClick={props.refreshQuote} variant="secondary">
                    New quote
                </Button>
            ) : ""}

        </>
    )
}
