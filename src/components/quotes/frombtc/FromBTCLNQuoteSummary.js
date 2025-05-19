import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useSwapState } from "../../../utils/useSwapState";
import { ScrollAnchor } from "../../ScrollAnchor";
import { LightningHyperlinkModal } from "./LightningHyperlinkModal";
import { useLightningWallet } from "../../../bitcoin/lightning/useLightningWallet";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { SwapForGasAlert } from "../../SwapForGasAlert";
import { StepByStep } from "../../StepByStep";
import { useLocalStorage } from "../../../utils/useLocalStorage";
import { LightningQR } from "./LightningQR";
import { ErrorAlert } from "../../ErrorAlert";
import { useFromBtcLnQuote } from "../../../utils/useFromBtcLnQuote";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage("crossLightning-autoClaim", false);
    const [initClicked, setInitClicked] = useState(false);
    const openModalRef = useRef(null);
    const onHyperlink = useCallback(() => {
        openModalRef.current();
    }, []);
    const { walletConnected } = useLightningWallet();
    const { waitForPayment, onCommit, onClaim, paymentWaiting, committing, claiming, paymentError, commitError, claimError, isQuoteExpired, isQuoteExpiredClaim, isFailed, isCreated, isClaimCommittable, isClaimClaimable, isClaimable, isSuccess, executionSteps } = useFromBtcLnQuote(props.quote, props.setAmountLock);
    useEffect(() => {
        if (props.quote != null && props.quote.isInitiated()) {
            waitForPayment();
        }
    }, [props.quote]);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_PAID) {
            if (autoClaim || walletConnected)
                onCommit(true).then(() => {
                    if (!canClaimInOneShot)
                        onClaim(true);
                });
        }
    }, [state]);
    return (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { openRef: openModalRef, hyperlink: props.quote.getQrData() }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", isCreated && !paymentWaiting ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap initialization error", error: paymentError }), _jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime }), _jsx(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => {
                            setInitClicked(true);
                            waitForPayment();
                        }, disabled: !!props.notEnoughForGas, size: "lg", children: "Initiate swap" })] }))) : "", isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsx(LightningQR, { quote: props.quote, payInstantly: initClicked, setAutoClaim: setAutoClaim, autoClaim: autoClaim, onHyperlink: onHyperlink }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: true }), _jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })] })) : "", isClaimable ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 tab-accent", children: [_jsx("label", { children: "Lightning network payment received" }), _jsx("label", { children: "Claim it below to finish the swap!" })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Swap " + ((canClaimInOneShot || claimError != null) ? "claim" : " claim initialization") + " error", error: commitError ?? claimError }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: state === FromBTCLNSwapState.PR_PAID && !claiming && !committing }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onCommit(), disabled: committing || (!canClaimInOneShot && !isClaimCommittable), size: canClaimInOneShot ? "lg" : isClaimCommittable ? "lg" : "sm", children: [committing ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", canClaimInOneShot ?
                                "Finish swap (claim funds)" :
                                !isClaimCommittable ?
                                    "1. Initialized" :
                                    committing ?
                                        "1. Initializing..." :
                                        "1. Finish swap (initialize)"] }), !canClaimInOneShot ? (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming || !isClaimClaimable, size: isClaimClaimable ? "lg" : "sm", className: "mt-2", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"] })) : ""] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (isQuoteExpired ||
                isFailed ||
                isSuccess) ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", show: isFailed, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] }), _jsx(SwapExpiryProgressBar, { show: isQuoteExpired, expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: isInitiated ? "Swap expired! Your lightning payment should refund shortly." : "Swap expired!", quoteAlias: "Swap" }), _jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })] })) : "", _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
