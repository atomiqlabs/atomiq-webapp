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
import { useAsync } from "../../../utils/useAsync";
import { useAbortSignalRef } from "../../../utils/useAbortSignal";
import { SwapForGasAlert } from "../../SwapForGasAlert";
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { ic_swap_horizontal_circle_outline } from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { StepByStep } from "../../StepByStep";
import { useStateRef } from "../../../utils/useStateRef";
import { useLocalStorage } from "../../../utils/useLocalStorage";
import { LightningQR } from "./LightningQR";
import { ErrorAlert } from "../../ErrorAlert";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage("crossLightning-autoClaim", false);
    const [initClicked, setInitClicked] = useState(false);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const openModalRef = useRef(null);
    const onHyperlink = useCallback(() => {
        openModalRef.current();
    }, []);
    const { walletConnected } = useLightningWallet();
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
        if (props.quote != null && props.quote.isInitiated()) {
            onCommit();
        }
    }, [props.quote]);
    const [onClaim, claiming, claimSuccess, claimError] = useAsync((skipChecks) => props.quote.commitAndClaim(signer, null, skipChecks), [props.quote, signer]);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_PAID) {
            if (autoClaim || walletConnected)
                onClaim(true);
        }
    }, [state]);
    const isQuoteExpired = state === FromBTCLNSwapState.QUOTE_EXPIRED ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !claiming && !paymentWaiting);
    const isQuoteExpiredClaim = isQuoteExpired && props.quote.signatureData != null;
    const isFailed = state === FromBTCLNSwapState.FAILED ||
        state === FromBTCLNSwapState.EXPIRED;
    const isCreated = state === FromBTCLNSwapState.PR_CREATED ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);
    const isClaimable = state === FromBTCLNSwapState.PR_PAID ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && claiming) ||
        state === FromBTCLNSwapState.CLAIM_COMMITED;
    const isSuccess = state === FromBTCLNSwapState.CLAIM_CLAIMED;
    useEffect(() => {
        if (isQuoteExpired || isFailed || isSuccess) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isQuoteExpired, isFailed, isSuccess]);
    const executionSteps = [
        { icon: ic_check_circle_outline, text: "Lightning payment received", type: "success" },
        { icon: ic_swap_horizontal_circle_outline, text: "Send claim transaction", type: "disabled" }
    ];
    if (isCreated)
        executionSteps[0] = { icon: ic_flash_on_outline, text: "Awaiting lightning payment", type: "loading" };
    if (isQuoteExpired && !isQuoteExpiredClaim)
        executionSteps[0] = { icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed" };
    if (isQuoteExpiredClaim) {
        executionSteps[0] = { icon: ic_refresh, text: "Lightning payment reverted", type: "failed" };
        executionSteps[1] = { icon: ic_watch_later_outline, text: "Claim transaction expired", type: "failed" };
    }
    if (isClaimable)
        executionSteps[1] = { icon: ic_swap_horizontal_circle_outline, text: claiming ? "Sending claim transaction" : "Send claim transaction", type: "loading" };
    if (isSuccess)
        executionSteps[1] = { icon: ic_verified_outline, text: "Claim success", type: "success" };
    if (isFailed) {
        executionSteps[0] = { icon: ic_refresh, text: "Lightning payment reverted", type: "failed" };
        executionSteps[1] = { icon: ic_watch_later_outline, text: "Swap expired", type: "failed" };
    }
    return (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { openRef: openModalRef, hyperlink: props.quote.getQrData() }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", isCreated && !paymentWaiting ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap initialization error", error: paymentError }), _jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime }), _jsx(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => {
                            setInitClicked(true);
                            onCommit();
                        }, disabled: !!props.notEnoughForGas, size: "lg", children: "Initiate swap" })] }))) : "", isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsx(LightningQR, { quote: props.quote, payInstantly: initClicked, setAutoClaim: setAutoClaim, autoClaim: autoClaim, onHyperlink: onHyperlink }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: true }), _jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })] })) : "", isClaimable ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 tab-accent", children: [_jsx("label", { children: "Lightning network payment received" }), _jsx("label", { children: "Claim it below to finish the swap!" })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Swap claim error", error: claimError }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: state === FromBTCLNSwapState.PR_PAID && !claiming }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming, size: "lg", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (isQuoteExpired ||
                isFailed ||
                isSuccess) ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", show: isFailed, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] }), _jsx(SwapExpiryProgressBar, { show: isQuoteExpired, expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: isInitiated ? "Swap expired! Your lightning payment should refund shortly." : "Swap expired!", quoteAlias: "Swap" }), _jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })] })) : "", _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
