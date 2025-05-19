import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useSwapState } from "../../../utils/useSwapState";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { StepByStep } from "../../StepByStep";
import { ErrorAlert } from "../../ErrorAlert";
import { useFromBtcLnQuote } from "../../../utils/useFromBtcLnQuote";
export function LNURLWithdrawQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
    const { waitForPayment, onCommit, onClaim, paymentWaiting, committing, claiming, paymentError, commitError, claimError, isQuoteExpired, isQuoteExpiredClaim, isFailed, isCreated, isClaimCommittable, isClaimClaimable, isClaimable, isSuccess, executionSteps } = useFromBtcLnQuote(props.quote, props.setAmountLock);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_CREATED) {
            if (props.autoContinue)
                waitForPayment();
        }
        if (state === FromBTCLNSwapState.PR_PAID) {
            onCommit(true).then(() => {
                if (!canClaimInOneShot)
                    onClaim(true);
            });
        }
    }, [state, onCommit]);
    return (_jsxs(_Fragment, { children: [isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", _jsx(SwapExpiryProgressBar, { expired: isQuoteExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: (isClaimable ||
                    isQuoteExpiredClaim) && !committing && !claiming && signer !== undefined }), (isCreated ||
                isClaimable) ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap " + ((canClaimInOneShot || claimError != null) ? "claim" : "claim initialization") + " error", error: claimError ?? commitError ?? paymentError }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => isClaimable ? onCommit() : waitForPayment(), disabled: committing || paymentWaiting || (!canClaimInOneShot && isClaimClaimable), size: canClaimInOneShot ? "lg" : isClaimClaimable ? "sm" : "lg", children: [committing || paymentWaiting ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", canClaimInOneShot ?
                                "Claim" :
                                isClaimClaimable ?
                                    "1. Initialized" :
                                    committing ?
                                        "1. Initializing..." :
                                        "1. Initialize swap"] }), !canClaimInOneShot ? (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming || !isClaimClaimable, size: isClaimClaimable ? "lg" : "sm", className: "mt-2", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"] })) : ""] }))) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", isFailed ? (_jsxs(Alert, { variant: "danger", className: "mb-0", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] })) : "", (isQuoteExpired ||
                isFailed ||
                (isSuccess && props.type !== "payment")) ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : ""] }));
}
