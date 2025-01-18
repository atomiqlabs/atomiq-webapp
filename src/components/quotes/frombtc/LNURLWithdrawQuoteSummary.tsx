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
import {useAbortSignalRef} from "../../../utils/useAbortSignal";
import {useStateRef} from "../../../utils/useStateRef";

import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../StepByStep";
import {ErrorAlert} from "../../ErrorAlert";

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

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const setAmountLockRef = useStateRef(props.setAmountLock);
    const abortSignalRef = useAbortSignalRef([props.quote]);

    const [onContinue, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        return props.quote.waitForPayment(abortSignalRef.current, 2).then(() => true).catch(err => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote]);

    const [onClaim, claiming, claimSuccess, claimError] = useAsync(
        (skipChecks?: boolean) => props.quote.commitAndClaim(signer, null, skipChecks),
        [props.quote, signer]
    );

    useEffect(() => {
        if(state===FromBTCLNSwapState.PR_CREATED) {
            if(props.autoContinue) onContinue();
        }
        if(state===FromBTCLNSwapState.PR_PAID) {
            onClaim();
        }
    }, [state, onClaim]);

    const isQuoteExpired = state === FromBTCLNSwapState.QUOTE_EXPIRED ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !claiming && !paymentWaiting);

    const isQuoteExpiredClaim = isQuoteExpired && props.quote.signatureData!=null;

    const isFailed = state===FromBTCLNSwapState.FAILED ||
        state===FromBTCLNSwapState.EXPIRED;

    const isCreated = state===FromBTCLNSwapState.PR_CREATED ||
        (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);

    const isClaimable = state===FromBTCLNSwapState.PR_PAID ||
        (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && claiming) ||
        state===FromBTCLNSwapState.CLAIM_COMMITED;

    const isSuccess = state===FromBTCLNSwapState.CLAIM_CLAIMED;

    useEffect(() => {
        if(isQuoteExpired || isFailed || isSuccess) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        }
    }, [isQuoteExpired, isFailed, isSuccess]);

    /*
    Steps:
    1. Requesting lightning payment -> Lightning payment received
    2. Send claim transaction -> Sending claim transaction -> Claim success
     */

    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Lightning payment received", type: "success"},
        {icon: ic_swap_horizontal_circle_outline, text: "Send claim transaction", type: "disabled"}
    ];
    if(isCreated && !paymentWaiting) executionSteps[0] = {icon: ic_flash_on_outline, text: "Request lightning payment", type: "loading"};
    if(isCreated && paymentWaiting) executionSteps[0] = {icon: ic_hourglass_top_outline, text: "Requesting lightning payment", type: "loading"};
    if(isQuoteExpired && !isQuoteExpiredClaim) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};
    if(isQuoteExpiredClaim) {
        executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
        executionSteps[1] = {icon: ic_watch_later_outline, text: "Claim transaction expired", type: "failed"};
    }
    if(isClaimable) executionSteps[1] = {icon: ic_swap_horizontal_circle_outline, text: claiming ? "Sending claim transaction" : "Send claim transaction", type: "loading"};
    if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Claim success", type: "success"};
    if(isFailed) {
        executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
        executionSteps[1] = {icon: ic_watch_later_outline, text: "Swap expired", type: "failed"};
    }

    return (
        <>
            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

            <SwapExpiryProgressBar
                expired={isQuoteExpired}
                timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                show={(
                    isClaimable ||
                    isQuoteExpiredClaim
                ) && !claiming && signer!==undefined}
            />

            {(
                isCreated ||
                isClaimable
            ) ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <ErrorAlert className="mb-3" title="Swap claim error" error={claimError ?? paymentError}/>

                        <ButtonWithSigner
                            signer={signer} chainId={props.quote.chainIdentifier} disabled={claiming || paymentWaiting}
                            onClick={() => isClaimable ? onClaim() : onContinue()} size="lg"
                        >
                            {claiming || paymentWaiting ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Claim
                        </ButtonWithSigner>
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
