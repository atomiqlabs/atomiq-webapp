import * as React from "react";
import {useEffect} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {LnForGasSwap, LnForGasSwapState} from "@atomiqlabs/sdk";
import {useSwapState} from "../../../utils/useSwapState";
import {ScrollAnchor} from "../../ScrollAnchor";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";
import {useAsync} from "../../../utils/hooks/useAsync";
import {useAbortSignalRef} from "../../../utils/hooks/useAbortSignal";

import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {ic_hourglass_top_outline} from "react-icons-kit/md/ic_hourglass_top_outline";
import {SingleStep, StepByStep} from "../../StepByStep";
import {useStateRef} from "../../../utils/hooks/useStateRef";
import {LightningQR} from "./LightningQR";
import {ErrorAlert} from "../../ErrorAlert";

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function TrustedFromBTCLNQuoteSummary(props: {
    quote: LnForGasSwap,
    refreshQuote: () => void,
    setAmountLock?: (isLocked: boolean) => void,
    abortSwap?: () => void
}) {
    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const setAmountLockRef = useStateRef(props.setAmountLock);

    const abortSignalRef = useAbortSignalRef([props.quote]);

    const [onCommit, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        return props.quote.waitForPayment(abortSignalRef.current, 2).then(() => true).catch(err => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote]);

    useEffect(() => {
        if(props.quote!=null && props.quote.getState()===LnForGasSwapState.PR_CREATED) {
            onCommit();
        }
    }, [props.quote]);

    const isQuoteExpired = state === LnForGasSwapState.EXPIRED && !paymentWaiting;

    const isFailed = state===LnForGasSwapState.FAILED;

    const isCreated = state===LnForGasSwapState.PR_CREATED;

    const isPaid = state===LnForGasSwapState.PR_PAID;

    const isSuccess = state===LnForGasSwapState.FINISHED;

    useEffect(() => {
        if(isQuoteExpired || isFailed || isSuccess) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        }
    }, [isQuoteExpired, isFailed, isSuccess]);

    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Lightning payment received", type: "success"},
        {icon: ic_swap_horizontal_circle_outline, text: "Receive funds", type: "disabled"}
    ];
    if(isPaid) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Receiving funds", type: "loading"};
    if(isCreated) executionSteps[0] = {icon: ic_flash_on_outline, text: "Awaiting lightning payment", type: "loading"};
    if(isQuoteExpired) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};
    if(isFailed) {
        executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
        executionSteps[1] = {icon: ic_watch_later_outline, text: "Swap failed", type: "failed"};
    }
    if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Payout success", type: "success"};

    return (
        <>
            <StepByStep steps={executionSteps}/>

            {isCreated && !paymentWaiting ? (
                <>
                    <ErrorAlert className="mb-3" title="Swap initialization error" error={paymentError}/>

                    <Button variant="secondary" onClick={() => {
                        onCommit();
                    }}>
                        Retry
                    </Button>
                </>
            ) : ""}

            {isCreated && paymentWaiting ? (
                <>
                    <LightningQR
                        quote={props.quote}
                        payInstantly={state===LnForGasSwapState.PR_CREATED}
                    />

                    <SwapExpiryProgressBar
                        timeRemaining={quoteTimeRemaining}
                        totalTime={totalQuoteTime}
                        show={true}
                    />

                    <Button onClick={props.abortSwap} variant="danger">
                        Abort swap
                    </Button>
                </>
            ) : ""}

            {isPaid ? (
                <>
                    <div className="tab-accent">
                        <div className="d-flex flex-column align-items-center p-2">
                            <Spinner/>
                            <label>Receiving funds...</label>
                        </div>
                    </div>
                </>
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className="mb-3">
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                </Alert>
            ) : ""}

            {(
                isQuoteExpired ||
                isFailed
            ) ? (
                <>
                    <Alert variant="danger" className="mb-3" show={isFailed}>
                        <strong>Swap failed</strong>
                        <label>Swap failed, your lightning payment will be refunded shortly!</label>
                    </Alert>

                    <SwapExpiryProgressBar
                        show={isQuoteExpired}
                        expired={true}
                        timeRemaining={quoteTimeRemaining}
                        totalTime={totalQuoteTime}
                        expiryText={"Swap expired!"} quoteAlias="Swap"
                    />

                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                </>
            ) : ""}

            <ScrollAnchor trigger={isInitiated}></ScrollAnchor>

        </>
    )
}
