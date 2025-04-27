import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Spinner } from "react-bootstrap";
import { SpvFromBTCSwapState } from "@atomiqlabs/sdk";
import { getDeltaText } from "../../../utils/Utils";
import { FEConstants } from "../../../FEConstants";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useOnchainWallet } from "../../../bitcoin/onchain/useOnchainWallet";
import { useSwapState } from "../../../utils/useSwapState";
import { useAsync } from "../../../utils/hooks/useAsync";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_swap_horizontal_circle_outline } from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { StepByStep } from "../../StepByStep";
import { useStateRef } from "../../../utils/hooks/useStateRef";
import { useAbortSignalRef } from "../../../utils/hooks/useAbortSignal";
import { ErrorAlert } from "../../ErrorAlert";
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */
export function SpvVaultFromBTCQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote, false);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const { walletConnected, disconnect } = useOnchainWallet();
    const isAlreadyClaimable = useMemo(() => props.quote != null ? props.quote.canClaim() : false, [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const [onSend, sendLoading, sendSuccess, sendError] = useAsync(() => {
        if (setAmountLockRef.current != null) {
            console.log("SpvVaultFromBTCQuoteSummary: onSend(): setting amount lock to true");
            setAmountLockRef.current(true);
        }
        return props.quote.signAndSubmit(walletConnected, Math.max(props.feeRate, props.quote.minimumBtcFeeRate)).catch(e => {
            if (setAmountLockRef.current != null) {
                console.log("SpvVaultFromBTCQuoteSummary: onSend(): signAndSubmit failed - setting amount lock to false");
                setAmountLockRef.current(false);
            }
            throw e;
        });
    }, [props.quote, walletConnected, props.feeRate]);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
        return props.quote.waitForBitcoinTransaction(abortSignalRef.current, null, (txId, confirmations, confirmationTarget, txEtaMs) => {
            if (txId == null) {
                setTxData(null);
                return;
            }
            console.log("BTC tx eta: ", txEtaMs);
            setTxData({
                txId,
                confirmations,
                confTarget: confirmationTarget,
                txEtaMs
            });
        });
    }, [props.quote]);
    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return props.quote.claim(signer);
    }, [props.quote, signer]);
    const [txData, setTxData] = useState(null);
    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if (state === SpvFromBTCSwapState.POSTED || state === SpvFromBTCSwapState.BROADCASTED) {
            props.quote.getBitcoinPayment().then(resp => {
                if (resp != null)
                    setTxData({
                        confTarget: resp.targetConfirmations,
                        confirmations: resp.confirmations,
                        txEtaMs: null,
                        txId: resp.txId
                    });
                onWaitForPayment();
            });
        }
        let timer = null;
        if (state === SpvFromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 60 * 1000);
        }
        return () => {
            if (timer != null)
                clearTimeout(timer);
            setClaimable(false);
        };
    }, [state]);
    const hasEnoughBalance = useMemo(() => props.balance == null || props.quote == null ? true : props.balance >= props.quote.getInput().rawAmount, [props.balance, props.quote]);
    const isQuoteExpired = state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
        (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && !sendLoading && !waitingPayment);
    const isCreated = state === SpvFromBTCSwapState.CREATED ||
        (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && sendLoading);
    const isSending = state === SpvFromBTCSwapState.CREATED && sendLoading;
    const isBroadcasting = state === SpvFromBTCSwapState.SIGNED || state === SpvFromBTCSwapState.POSTED;
    const isReceived = state === SpvFromBTCSwapState.BROADCASTED && txData != null;
    const isClaimable = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isFailed = state === SpvFromBTCSwapState.FAILED || state === SpvFromBTCSwapState.DECLINED || state === SpvFromBTCSwapState.CLOSED;
    const isSuccess = state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED;
    useEffect(() => {
        if (isSuccess || isFailed || isQuoteExpired) {
            console.log("SpvVaultFromBTCQuoteSummary: useEffect(state): setting amount lock to false");
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isQuoteExpired]);
    /*
    Steps:
    1. Bitcoin payment -> Signing bitcoin transaction -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
    2. Claim transaction -> Sending claim transaction -> Claim success
     */
    const executionSteps = [
        { icon: bitcoin, text: "Bitcoin payment", type: "loading" },
        { icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "disabled" },
    ];
    if (isSending)
        executionSteps[0] = { icon: ic_hourglass_empty_outline, text: "Signing bitcoin transaction", type: "loading" };
    if (isBroadcasting)
        executionSteps[0] = { icon: ic_hourglass_empty_outline, text: "Broadcasting bitcoin transaction", type: "loading" };
    if (isReceived)
        executionSteps[0] = { icon: ic_hourglass_top_outline, text: "Waiting bitcoin confirmations", type: "loading" };
    if (isQuoteExpired)
        executionSteps[0] = { icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed" };
    if (isClaimable || isClaiming || isSuccess)
        executionSteps[0] = { icon: ic_check_circle_outline, text: "Bitcoin confirmed", type: "success" };
    if (isFailed)
        executionSteps[0] = { icon: ic_refresh, text: "Bitcoin payment reverted", type: "failed" };
    if (isClaimable)
        executionSteps[1] = { icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "loading" };
    if (isClaiming)
        executionSteps[1] = { icon: ic_hourglass_empty_outline, text: "Sending claim transaction", type: "loading" };
    if (isSuccess)
        executionSteps[1] = { icon: ic_verified_outline, text: "Claim success", type: "success" };
    return (_jsxs(_Fragment, { children: [isInitiated || (isCreated && sendLoading) ? _jsx(StepByStep, { steps: executionSteps }) : "", _jsx(SwapExpiryProgressBar, { expired: isQuoteExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: (isCreated || isQuoteExpired) && !sendLoading && walletConnected != null && hasEnoughBalance }), isCreated ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Sending BTC failed", error: sendError }), _jsxs(ButtonWithSigner, { signer: walletConnected, chainId: "BITCOIN", onClick: onSend, disabled: sendLoading || !hasEnoughBalance, size: "lg", className: "d-flex flex-row", children: [sendLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with ", _jsx("img", { width: 20, height: 20, src: walletConnected?.getIcon(), className: "ms-2 me-1" }), " ", walletConnected?.getName()] })] })) : "", isBroadcasting ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("small", { className: "mt-2", children: "Sending bitcoin transaction..." })] })) : "", isReceived ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx("small", { className: "mb-2", children: "Transaction successfully received, waiting for confirmations..." }), _jsx(Spinner, {}), _jsxs("label", { children: [txData.confirmations, " / ", txData.confTarget] }), _jsx("label", { style: { marginTop: "-6px" }, children: "Confirmations" }), _jsx("a", { className: "mb-2 text-overflow-ellipsis text-nowrap overflow-hidden", style: { width: "100%" }, target: "_blank", href: FEConstants.btcBlockExplorer + txData.txId, children: _jsx("small", { children: txData.txId }) }), _jsxs(Badge, { className: "text-black" + (txData.txEtaMs == null ? " d-none" : ""), bg: "light", pill: true, children: ["ETA: ", txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)] }), waitPaymentError != null ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Wait payment error", error: waitPaymentError }), _jsx(Button, { onClick: onWaitForPayment, variant: "secondary", children: "Retry" })] })) : ""] })) : "", isClaimable && !(claimable || isAlreadyClaimable) ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("small", { className: "mt-2", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] })) : "", (isClaimable || isClaiming) && (claimable || isAlreadyClaimable) ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-flex flex-column align-items-center tab-accent mb-3", children: _jsx("label", { children: "Transaction received & confirmed, you can claim your funds manually now!" }) }), _jsx(ErrorAlert, { className: "mb-3", title: "Claim error", error: claimError }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: onClaim, disabled: claimLoading, size: "lg", children: [claimLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", isFailed ? (_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap transaction reverted, no funds were sent!" })] })) : "", (isQuoteExpired ||
                isFailed ||
                isSuccess) ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : ""] }));
}
