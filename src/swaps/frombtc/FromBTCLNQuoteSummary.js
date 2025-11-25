import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FromBTCLNSwapState, SwapType } from "@atomiqlabs/sdk";
import { ButtonWithWallet } from "../../wallets/ButtonWithWallet";
import { useSwapState } from "../hooks/useSwapState";
import { ScrollAnchor } from "../../components/ScrollAnchor";
import { LightningHyperlinkModal } from "../components/LightningHyperlinkModal";
import { SwapExpiryProgressBar } from "../components/SwapExpiryProgressBar";
import { SwapForGasAlert } from "../components/SwapForGasAlert";
import { StepByStep } from "../../components/StepByStep";
import { useLocalStorage } from "../../utils/hooks/useLocalStorage";
import { LightningQR } from "../components/LightningQR";
import { ErrorAlert } from "../../components/ErrorAlert";
import { useFromBtcLnQuote } from "./useFromBtcLnQuote";
import { ChainDataContext } from "../../wallets/context/ChainDataContext";
import { useSmartChainWallet } from "../../wallets/hooks/useSmartChainWallet";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNQuoteSummary(props) {
    const lightningWallet = useContext(ChainDataContext).LIGHTNING?.wallet;
    const smartChainWallet = useSmartChainWallet(props.quote, true);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage("crossLightning-autoClaim", false);
    const [initClicked, setInitClicked] = useState(false);
    const openModalRef = useRef(null);
    const onHyperlink = useCallback(() => {
        openModalRef.current("hyperlink");
    }, []);
    const onCopy = useCallback(() => {
        openModalRef.current("copy");
    }, []);
    const { waitForPayment, onCommit, onClaim, paymentWaiting, committing, claiming, paymentError, commitError, claimError, isQuoteExpired, isQuoteExpiredClaim, isFailed, isCreated, isLpAutoCommiting, isClaimCommittable, isClaimClaimable, isClaimable, isSuccess, isWaitingForWatchtowerClaim, executionSteps, canClaimInOneShot, requiresDestinationWalletConnected } = useFromBtcLnQuote(props.quote, props.setAmountLock);
    useEffect(() => {
        if (props.quote != null && props.quote.isInitiated() && props.quote.state === FromBTCLNSwapState.PR_CREATED) {
            waitForPayment();
        }
    }, [props.quote]);
    useEffect(() => {
        if (props.quote.getType() === SwapType.FROM_BTCLN_AUTO)
            return;
        if (state === FromBTCLNSwapState.PR_PAID) {
            if (autoClaim || lightningWallet != null)
                onCommit(true).then(() => {
                    if (!canClaimInOneShot)
                        onClaim();
                });
        }
    }, [state]);
    return (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { openRef: openModalRef, onAccept: (type) => {
                    if (type === "hyperlink") {
                        window.location.href = props.quote.getHyperlink();
                    }
                    if (type === "copy") { }
                }, chainId: props.quote.chainIdentifier }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", isCreated && !paymentWaiting ? (requiresDestinationWalletConnected && smartChainWallet === undefined ? (_jsx(ButtonWithWallet, { noRequireConnection: !requiresDestinationWalletConnected, chainId: props.quote.chainIdentifier, requiredWalletAddress: props.quote._getInitiator(), size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap initialization error", error: paymentError }), _jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime }), _jsx(ButtonWithWallet, { noRequireConnection: !requiresDestinationWalletConnected, requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, onClick: () => {
                            setInitClicked(true);
                            waitForPayment();
                        }, disabled: !!props.notEnoughForGas, size: "lg", children: "Initiate swap" })] }))) : "", isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsx(LightningQR, { quote: props.quote, payInstantly: initClicked, setAutoClaim: props.quote?.getType() === SwapType.FROM_BTCLN_AUTO ? null : setAutoClaim, autoClaim: autoClaim, onHyperlink: onHyperlink, onCopy: onCopy }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: true }), _jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })] })) : "", isLpAutoCommiting ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("small", { className: "mt-2", children: "Lightning network payment received, waiting for LP to initiate..." })] })) : "", isClaimable && isWaitingForWatchtowerClaim ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("small", { className: "mt-2", children: "Lightning network payment received, waiting for claim by watchtowers..." })] })) : "", isClaimable && !isWaitingForWatchtowerClaim ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3 tab-accent", children: [_jsx("label", { children: "Lightning network payment received" }), _jsx("label", { children: "Claim it below to finish the swap!" })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Swap " + ((canClaimInOneShot || claimError != null) ? "claim" : " claim initialization") + " error", error: commitError ?? claimError }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: state === FromBTCLNSwapState.PR_PAID && !claiming && !committing }), _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, onClick: () => props.quote?.getType() === SwapType.FROM_BTCLN ? onCommit() : onClaim(), disabled: committing || claiming || (!canClaimInOneShot && !isClaimCommittable), size: canClaimInOneShot ? "lg" : isClaimCommittable ? "lg" : "sm", children: [committing || claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", canClaimInOneShot ?
                                "Finish swap (claim funds)" :
                                !isClaimCommittable ?
                                    "1. Initialized" :
                                    committing ?
                                        "1. Initializing..." :
                                        "1. Finish swap (initialize)"] }), !canClaimInOneShot ? (_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming || !isClaimClaimable, size: isClaimClaimable ? "lg" : "sm", className: "mt-2", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"] })) : ""] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (isQuoteExpired ||
                isFailed ||
                isSuccess) ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", show: isFailed, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] }), _jsx(SwapExpiryProgressBar, { show: isQuoteExpired, expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: isInitiated ? "Swap expired! Your lightning payment should refund shortly." : "Swap expired!", quoteAlias: "Swap" }), _jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })] })) : "", _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
