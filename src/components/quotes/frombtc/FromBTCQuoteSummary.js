import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Spinner } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import ValidatedInput from "../../ValidatedInput";
import { FromBTCSwapState, Tokens } from "@atomiqlabs/sdk";
import Icon from "react-icons-kit";
import { clipboard } from "react-icons-kit/fa/clipboard";
import { externalLink } from 'react-icons-kit/fa/externalLink';
import { getDeltaText } from "../../../utils/Utils";
import { FEConstants } from "../../../FEConstants";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { ScrollAnchor } from "../../ScrollAnchor";
import { CopyOverlay } from "../../CopyOverlay";
import { useOnchainWallet } from "../../../bitcoin/onchain/useOnchainWallet";
import { useSwapState } from "../../../utils/useSwapState";
import { useAsync } from "../../../utils/useAsync";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { SwapForGasAlert } from "../../SwapForGasAlert";
import { ic_gavel_outline } from 'react-icons-kit/md/ic_gavel_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_pending_outline } from 'react-icons-kit/md/ic_pending_outline';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_swap_horizontal_circle_outline } from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { StepByStep } from "../../StepByStep";
import { useStateRef } from "../../../utils/useStateRef";
import { useAbortSignalRef } from "../../../utils/useAbortSignal";
import { OnchainAddressCopyModal } from "./OnchainAddressCopyModal";
import { useLocalStorage } from "../../../utils/useLocalStorage";
/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const { walletConnected, disconnect, pay, payLoading, paySuccess, payTxId, payError } = useOnchainWallet();
    const sendBitcoinTransactionRef = useRef(null);
    sendBitcoinTransactionRef.current = () => {
        if (!!walletConnected)
            pay(props.quote.getBitcoinAddress(), props.quote.getInput().rawAmount, props.feeRate != null && props.feeRate !== 0 ? props.feeRate : null);
    };
    const isAlreadyClaimable = useMemo(() => props.quote != null ? props.quote.isClaimable() : false, [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(() => {
        if (setAmountLockRef.current != null)
            setAmountLockRef.current(true);
        return props.quote.commit(signer).then(resp => {
            sendBitcoinTransactionRef.current();
            return resp;
        }).catch(e => {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
            throw e;
        });
    }, [props.quote, signer]);
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
    const textFieldRef = useRef();
    const openModalRef = useRef(null);
    const [txData, setTxData] = useState(null);
    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if (state === FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) {
            props.quote.getBitcoinPayment().then(resp => {
                if (state === FromBTCSwapState.EXPIRED) {
                    if (resp == null)
                        return;
                }
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
        if (state === FromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 20 * 1000);
        }
        return () => {
            if (timer != null)
                clearTimeout(timer);
            setClaimable(false);
        };
    }, [state]);
    const hasEnoughBalance = useMemo(() => props.balance == null || props.quote == null ? true : props.balance.gte(props.quote.getInput().rawAmount), [props.balance, props.quote]);
    const isQuoteExpired = state === FromBTCSwapState.QUOTE_EXPIRED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && !commitLoading);
    const isCreated = state === FromBTCSwapState.PR_CREATED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && commitLoading);
    const isCommited = state === FromBTCSwapState.CLAIM_COMMITED && txData == null;
    const isReceived = state === (FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) && txData != null;
    const isClaimable = state === FromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === FromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isExpired = state === FromBTCSwapState.EXPIRED && txData == null;
    const isFailed = state === FromBTCSwapState.FAILED;
    const isSuccess = state === FromBTCSwapState.CLAIM_CLAIMED;
    useEffect(() => {
        if (isSuccess || isFailed || isExpired) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isExpired]);
    /*
    Steps:
    1. Opening swap address -> Swap address opened
    2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
    3. Claim transaction -> Sending claim transaction -> Claim success
     */
    const executionSteps = [
        { icon: ic_check_circle_outline, text: "Swap address opened", type: "success" },
        { icon: bitcoin, text: "Bitcoin payment", type: "disabled" },
        { icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "disabled" },
    ];
    if (isCreated && !commitLoading)
        executionSteps[0] = { icon: ic_gavel_outline, text: "Open swap address", type: "loading" };
    if (isCreated && commitLoading)
        executionSteps[0] = { icon: ic_hourglass_empty_outline, text: "Opening swap address", type: "loading" };
    if (isQuoteExpired)
        executionSteps[0] = { icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed" };
    if (isCommited)
        executionSteps[1] = { icon: ic_pending_outline, text: "Awaiting bitcoin payment", type: "loading" };
    if (isReceived)
        executionSteps[1] = { icon: ic_hourglass_top_outline, text: "Waiting bitcoin confirmations", type: "loading" };
    if (isClaimable || isClaiming || isSuccess)
        executionSteps[1] = { icon: ic_check_circle_outline, text: "Bitcoin confirmed", type: "success" };
    if (isExpired || isFailed)
        executionSteps[1] = { icon: ic_watch_later_outline, text: "Swap expired", type: "failed" };
    if (isClaimable)
        executionSteps[2] = { icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "loading" };
    if (isClaiming)
        executionSteps[2] = { icon: ic_hourglass_empty_outline, text: "Sending claim transaction", type: "loading" };
    if (isSuccess)
        executionSteps[2] = { icon: ic_verified_outline, text: "Claim success", type: "success" };
    const [_, setShowCopyWarning, showCopyWarningRef] = useLocalStorage("crossLightning-copywarning", true);
    const addressContent = useCallback((show) => (_jsxs(_Fragment, { children: [_jsx(Alert, { variant: "warning", className: "mb-3", children: _jsxs("label", { children: ["Please make sure that you send an ", _jsx("b", { children: _jsx("u", { children: "EXACT" }) }), " amount in BTC, different amount wouldn't be accepted and you might loose funds!"] }) }), _jsx("div", { className: "mb-2", children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                        show(event.target, props.quote.getBitcoinAddress(), textFieldRef.current?.input?.current);
                    } }) }), _jsxs("label", { children: ["Please send exactly ", _jsx("strong", { children: props.quote.getInput().amount }), " ", Tokens.BITCOIN.BTC.ticker, " to the address"] }), _jsx(ValidatedInput, { type: "text", value: props.quote.getBitcoinAddress(), textEnd: (_jsx("a", { href: "javascript:void(0);", onClick: (event) => {
                        show(event.target, props.quote.getBitcoinAddress(), textFieldRef.current?.input?.current);
                    }, children: _jsx(Icon, { icon: clipboard }) })), onCopy: () => {
                    //Direct call to open the modal here breaks the copying, this is a workaround
                    if (showCopyWarningRef.current)
                        setTimeout(openModalRef.current, 100);
                }, inputRef: textFieldRef }), _jsx("div", { className: "d-flex justify-content-center mt-2", children: _jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center justify-content-center", onClick: () => {
                        window.location.href = props.quote.getQrData();
                    }, children: [_jsx(Icon, { icon: externalLink, className: "d-flex align-items-center me-2" }), " Open in BTC wallet app"] }) })] })), [props.quote]);
    return (_jsxs(_Fragment, { children: [_jsx(OnchainAddressCopyModal, { openRef: openModalRef, amountBtc: props.quote?.getInput()?.amount, setShowCopyWarning: setShowCopyWarning }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", _jsx(SwapExpiryProgressBar, { expired: isQuoteExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: (isCreated || isQuoteExpired) && !commitLoading && !props.notEnoughForGas && signer !== undefined && hasEnoughBalance }), _jsxs(Alert, { className: "text-center mb-3", show: commitError != null, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Swap initialization error" }), _jsx("label", { children: commitError?.message })] }), isCreated && hasEnoughBalance ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: onCommit, disabled: commitLoading || !!props.notEnoughForGas || !hasEnoughBalance, size: "lg", className: "d-flex flex-row", children: [commitLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Initiate swap"] })] }))) : "", isCommited ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-3 tab-accent", children: walletConnected != null ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-2", show: !!payError, children: [_jsx("strong", { children: "Sending BTC failed" }), _jsx("label", { children: payError })] }), _jsx("div", { className: "d-flex flex-column align-items-center justify-content-center", children: payTxId != null ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("label", { children: "Sending Bitcoin transaction..." })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center", disabled: payLoading, onClick: sendBitcoinTransactionRef.current, children: [payLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with ", _jsx("img", { width: 20, height: 20, src: walletConnected.getIcon(), className: "ms-2 me-1" }), " ", walletConnected.getName()] }), _jsx("small", { className: "mt-2", children: _jsx("a", { href: "javascript:void(0);", onClick: disconnect, children: "Or use a QR code/wallet address" }) })] })) })] })) : (_jsx(CopyOverlay, { placement: "top", children: addressContent })) }), _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }), waitPaymentError == null ? (_jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: true, variant: "danger", children: [_jsx("strong", { children: "Wait payment error" }), _jsx("label", { children: waitPaymentError?.message })] }), _jsx(Button, { onClick: onWaitForPayment, variant: "secondary", children: "Retry" })] }))] })) : "", isReceived ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx("small", { className: "mb-2", children: "Transaction successfully received, waiting for confirmations..." }), _jsx(Spinner, {}), _jsxs("label", { children: [txData.confirmations, " / ", txData.confTarget] }), _jsx("label", { style: { marginTop: "-6px" }, children: "Confirmations" }), _jsx("a", { className: "mb-2 text-overflow-ellipsis text-nowrap overflow-hidden", style: { width: "100%" }, target: "_blank", href: FEConstants.btcBlockExplorer + txData.txId, children: _jsx("small", { children: txData.txId }) }), _jsxs(Badge, { className: "text-black" + (txData.txEtaMs == null ? " d-none" : ""), bg: "light", pill: true, children: ["ETA: ", txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)] })] })) : "", isClaimable && !(claimable || isAlreadyClaimable) ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("small", { className: "mt-2", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] })) : "", (isClaimable || isClaiming) && (claimable || isAlreadyClaimable) ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-flex flex-column align-items-center tab-accent mb-3", children: _jsx("label", { children: "Transaction received & confirmed, you can claim your funds manually now!" }) }), _jsxs(Alert, { variant: "danger", className: "mb-3", show: !!claimError, children: [_jsx("strong", { children: "Claim error" }), _jsx("label", { children: claimError?.message })] }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: onClaim, disabled: claimLoading, size: "lg", children: [claimLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", isExpired ? (_jsx(SwapExpiryProgressBar, { expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" })) : "", isFailed ? (_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap address expired without receiving the required funds!" })] })) : "", (isQuoteExpired ||
                isExpired ||
                isFailed ||
                isSuccess) ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : "", _jsx(ScrollAnchor, { trigger: isCommited })] }));
}
