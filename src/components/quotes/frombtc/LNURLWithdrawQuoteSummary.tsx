import * as React from "react";
import {useContext, useEffect} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCLNSwapState} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";
import {useSwapState} from "../../../swaps/hooks/useSwapState";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";

import {StepByStep} from "../../StepByStep";
import {ErrorAlert} from "../../ErrorAlert";
import {useFromBtcLnQuote} from "../../../utils/useFromBtcLnQuote";

export function LNURLWithdrawQuoteSummary(props: {
    quote: FromBTCLNSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    autoContinue?: boolean,
    notEnoughForGas: bigint
}) {
    const {getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();

    const {
        waitForPayment, onCommit, onClaim,
        paymentWaiting, committing, claiming,
        paymentError, commitError, claimError,

        isQuoteExpired,
        isQuoteExpiredClaim,
        isFailed,
        isCreated,
        isClaimCommittable,
        isClaimClaimable,
        isClaimable,
        isSuccess,

        executionSteps
    } = useFromBtcLnQuote(props.quote, props.setAmountLock);

    useEffect(() => {
        if(state===FromBTCLNSwapState.PR_CREATED) {
            if(props.autoContinue) waitForPayment();
        }
        if(state===FromBTCLNSwapState.PR_PAID) {
            onCommit(true).then(() => {
                if(!canClaimInOneShot) onClaim(true)
            });
        }
    }, [state, onCommit]);

    return (
        <>
            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

            <SwapExpiryProgressBar
                expired={isQuoteExpired}
                timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                show={(
                    isClaimable ||
                    isQuoteExpiredClaim
                ) && !committing && !claiming && signer!==undefined}
            />

            {(
                isCreated ||
                isClaimable
            ) ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <ErrorAlert
                            className="mb-3"
                            title={"Swap "+((canClaimInOneShot || claimError!=null) ? "claim" : "claim initialization")+" error"}
                            error={claimError ?? commitError ?? paymentError}
                        />

                        <ButtonWithSigner
                            signer={signer}
                            chainId={props.quote?.chainIdentifier}
                            onClick={() => isClaimable ? onCommit() : waitForPayment()}
                            disabled={committing || paymentWaiting || (!canClaimInOneShot && isClaimClaimable)}
                            size={canClaimInOneShot ? "lg" : isClaimClaimable ? "sm" : "lg"}
                        >
                            {committing || paymentWaiting ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            {canClaimInOneShot ?
                                "Claim" :
                                isClaimClaimable ?
                                    "1. Initialized" :
                                    committing ?
                                        "1. Initializing..." :
                                        "1. Initialize swap"
                            }
                        </ButtonWithSigner>
                        {!canClaimInOneShot ? (
                            <ButtonWithSigner
                                signer={signer}
                                chainId={props.quote?.chainIdentifier}
                                onClick={() => onClaim()}
                                disabled={claiming || !isClaimClaimable}
                                size={isClaimClaimable ? "lg" : "sm"}
                                className="mt-2"
                            >
                                {claiming ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                {claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"}
                            </ButtonWithSigner>
                        ) : ""}
                    </>
                )
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className="mb-0">
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                </Alert>
            ) : ""}

            {isFailed ? (
                <Alert variant="danger" className="mb-0">
                    <strong>Swap failed</strong>
                    <label>Swap HTLC expired, your lightning payment will be refunded shortly!</label>
                </Alert>
            ) : ""}

            {(
                isQuoteExpired ||
                isFailed ||
                (isSuccess && props.type!=="payment")
            ) ? (
                <Button onClick={props.refreshQuote} variant="secondary">
                    New quote
                </Button>
            ) : ""}

        </>
    )
}
