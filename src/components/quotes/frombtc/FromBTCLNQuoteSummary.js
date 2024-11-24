import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Form, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import ValidatedInput from "../../ValidatedInput";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { clipboard } from 'react-icons-kit/fa/clipboard';
import Icon from "react-icons-kit";
import { LNNFCStartResult } from "../../../lnnfc/LNNFCReader";
import { externalLink } from 'react-icons-kit/fa/externalLink';
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useLNNFCScanner } from "../../../lnnfc/useLNNFCScanner";
import { CopyOverlay } from "../../CopyOverlay";
import { useSwapState } from "../../../utils/useSwapState";
import { ScrollAnchor } from "../../ScrollAnchor";
import { LightningHyperlinkModal } from "./LightningHyperlinkModal";
import { useAutoClaim } from "../../../utils/useAutoClaim";
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
    const { autoClaim, setAutoClaim } = useAutoClaim();
    const [payingWithLNURL, setPayingWithLNURL] = useState(false);
    const NFCScanning = useLNNFCScanner((result) => {
        //TODO: Maybe we need to stop the scanning here as well
        if (result.type !== "withdraw")
            return;
        props.quote.settleWithLNURLWithdraw(result).then(() => {
            setPayingWithLNURL(true);
        });
    });
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const textFieldRef = useRef();
    const openModalRef = useRef(null);
    const { walletConnected, disconnect, pay, payLoading, payError } = useLightningWallet();
    const [onCommit, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if (setAmountLockRef.current != null)
            setAmountLockRef.current(true);
        return props.quote.waitForPayment(abortSignalRef.current, 2).then(() => true).catch(err => {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote, pay]);
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
    return (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { openRef: openModalRef, hyperlink: props.quote.getQrData() }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", isCreated && !paymentWaiting ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: paymentError != null, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Swap initialization error" }), _jsx("label", { children: paymentError?.message })] }), _jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime }), _jsx(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => {
                            if (walletConnected)
                                pay(props.quote.getLightningInvoice());
                            onCommit();
                        }, disabled: !!props.notEnoughForGas, size: "lg", children: "Initiate swap" })] }))) : "", isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tab-accent mb-3", children: [payingWithLNURL ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsx(Spinner, { animation: "border" }), "Paying via NFC card..."] })) : walletConnected ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-2", show: !!payError, children: [_jsx("strong", { children: "Sending BTC failed" }), _jsx("label", { children: payError })] }), _jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center", disabled: payLoading, onClick: () => {
                                                    pay(props.quote.getLightningInvoice());
                                                }, children: [payLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with", _jsx("img", { width: 20, height: 20, src: "/wallets/WebLN.png", className: "ms-2 me-1" }), "WebLN"] }), _jsx("small", { className: "mt-2", children: _jsx("a", { href: "javascript:void(0);", onClick: disconnect, children: "Or use a QR code/LN invoice" }) })] })] })) : (_jsx(CopyOverlay, { placement: "top", children: (show) => (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-2", children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                                                    show(event.target, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                                                }, imageSettings: NFCScanning === LNNFCStartResult.OK ? {
                                                    src: "/icons/contactless.png",
                                                    excavate: true,
                                                    height: 50,
                                                    width: 50
                                                } : null }) }), _jsx("label", { children: "Please initiate a payment to this lightning network invoice" }), _jsx(ValidatedInput, { type: "text", value: props.quote.getLightningInvoice(), textEnd: (_jsx("a", { href: "javascript:void(0);", onClick: (event) => {
                                                    show(event.target, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                                                }, children: _jsx(Icon, { icon: clipboard }) })), inputRef: textFieldRef }), _jsx("div", { className: "d-flex justify-content-center mt-2", children: _jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center justify-content-center", onClick: openModalRef.current, children: [_jsx(Icon, { icon: externalLink, className: "d-flex align-items-center me-2" }), " Open in Lightning wallet app"] }) })] })) })), !walletConnected ? (_jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-3", children: [_jsx(Form.Check // prettier-ignore
                                    , { id: "autoclaim", type: "switch", onChange: (val) => setAutoClaim(val.target.checked), checked: autoClaim }), _jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label me-2", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })) : ""] }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: !payingWithLNURL }), _jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })] })) : "", isClaimable ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 tab-accent", children: [_jsx("label", { children: "Lightning network payment received" }), _jsx("label", { children: "Claim it below to finish the swap!" })] }), _jsxs(Alert, { className: "text-center mb-3", show: claimError != null, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Swap claim error" }), _jsx("label", { children: claimError?.message })] }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: state === FromBTCLNSwapState.PR_PAID && !claiming }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming, size: "lg", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (isQuoteExpired ||
                isFailed ||
                isSuccess) ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", show: isFailed, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] }), _jsx(SwapExpiryProgressBar, { show: isQuoteExpired, expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: isInitiated ? "Swap expired! Your lightning payment should refund shortly." : "Swap expired!", quoteAlias: "Swap" }), _jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })] })) : "", _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
