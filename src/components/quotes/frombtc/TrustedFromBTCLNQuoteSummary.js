import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { Alert, Button } from "react-bootstrap";
import { LnForGasSwapState } from "@atomiqlabs/sdk";
import { useSwapState } from "../../../utils/useSwapState";
import { ScrollAnchor } from "../../ScrollAnchor";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { useAsync } from "../../../utils/useAsync";
import { useAbortSignalRef } from "../../../utils/useAbortSignal";
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { ic_swap_horizontal_circle_outline } from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { StepByStep } from "../../StepByStep";
import { useStateRef } from "../../../utils/useStateRef";
import { LightningQR } from "./LightningQR";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function TrustedFromBTCLNQuoteSummary(props) {
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const [onCommit, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if (setAmountLockRef.current != null)
            setAmountLockRef.current(true);
        return props.quote.waitForPayment(abortSignalRef.current, 2).then(() => true).catch(err => {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote]);
    useEffect(() => {
        if (props.quote != null && props.quote.getState() === LnForGasSwapState.PR_CREATED) {
            onCommit();
        }
    }, [props.quote]);
    const isQuoteExpired = state === LnForGasSwapState.EXPIRED && !paymentWaiting;
    const isFailed = state === LnForGasSwapState.FAILED;
    const isCreated = state === LnForGasSwapState.PR_CREATED ||
        (state === LnForGasSwapState.EXPIRED && paymentWaiting);
    const isSuccess = state === LnForGasSwapState.FINISHED;
    useEffect(() => {
        if (isQuoteExpired || isFailed || isSuccess) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isQuoteExpired, isFailed, isSuccess]);
    const executionSteps = [
        { icon: ic_check_circle_outline, text: "Lightning payment received", type: "success" },
        { icon: ic_swap_horizontal_circle_outline, text: "Receive funds", type: "disabled" }
    ];
    if (isCreated)
        executionSteps[0] = { icon: ic_flash_on_outline, text: "Awaiting lightning payment", type: "loading" };
    if (isQuoteExpired)
        executionSteps[0] = { icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed" };
    if (isFailed) {
        executionSteps[0] = { icon: ic_refresh, text: "Lightning payment reverted", type: "failed" };
        executionSteps[1] = { icon: ic_watch_later_outline, text: "Swap failed", type: "failed" };
    }
    if (isSuccess)
        executionSteps[1] = { icon: ic_verified_outline, text: "Payout success", type: "success" };
    return (_jsxs(_Fragment, { children: [_jsx(StepByStep, { steps: executionSteps }), isCreated && !paymentWaiting ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: paymentError != null, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Swap initialization error" }), _jsx("label", { children: paymentError?.message })] }), _jsx(Button, { variant: "secondary", onClick: () => {
                            onCommit();
                        }, children: "Retry" })] })) : "", isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsx(LightningQR, { quote: props.quote, payInstantly: state === LnForGasSwapState.PR_CREATED }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: true }), _jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (isQuoteExpired ||
                isFailed) ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", show: isFailed, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap failed, your lightning payment will be refunded shortly!" })] }), _jsx(SwapExpiryProgressBar, { show: isQuoteExpired, expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: "Swap expired!", quoteAlias: "Swap" }), _jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })] })) : "", _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
