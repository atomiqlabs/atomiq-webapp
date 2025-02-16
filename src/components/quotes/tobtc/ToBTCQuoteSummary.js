import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { SwapType, ToBTCSwapState } from "@atomiqlabs/sdk";
import { toHumanReadableString } from "../../../utils/Currencies";
import * as bolt11 from "bolt11";
import { FEConstants } from "../../../FEConstants";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useSwapState } from "../../../utils/useSwapState";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
import { useAsync } from "../../../utils/useAsync";
import { useAbortSignalRef } from "../../../utils/useAbortSignal";
import { useStateRef } from "../../../utils/useStateRef";
import { ic_play_circle_outline } from 'react-icons-kit/md/ic_play_circle_outline';
import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { StepByStep } from "../../StepByStep";
import { ErrorAlert } from "../../ErrorAlert";
const SNOWFLAKE_LIST = new Set([
    "038f8f113c580048d847d6949371726653e02b928196bad310e3eda39ff61723f6",
    "03a6ce61fcaacd38d31d4e3ce2d506602818e3856b4b44faff1dde9642ba705976"
]);
/*
Steps lightning:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Lightning payment in-flight -> Lightning payment success

Steps on-chain:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Receiving BTC -> BTC received
3. Waiting BTC confirmations -> BTC confirmed
 */
export function ToBTCQuoteSummary(props) {
    const { swapper, getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [nonCustodialWarning, confidenceWarning] = useMemo(() => {
        if (props.quote.getType() === SwapType.TO_BTCLN) {
            const _quote = props.quote;
            if (_quote.getConfidence() === 0) {
                let isSnowflake = false;
                let isNonCustodial = false;
                const parsedRequest = bolt11.decode(_quote.getLightningInvoice());
                if (parsedRequest.tagsObject.routing_info != null) {
                    for (let route of parsedRequest.tagsObject.routing_info) {
                        isNonCustodial = true;
                        if (SNOWFLAKE_LIST.has(route.pubkey)) {
                            isSnowflake = true;
                        }
                    }
                }
                return [isNonCustodial, !isSnowflake];
            }
        }
        return [false, false];
    }, [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync((skipChecks) => {
        if (setAmountLockRef.current)
            setAmountLockRef.current(true);
        return props.quote.commit(signer, null, skipChecks).catch(err => {
            if (setAmountLockRef.current)
                setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote, signer]);
    const [onRefund, refundLoading, refundSuccess, refundError] = useAsync(async () => {
        const res = await props.quote.refund(signer);
        if (setAmountLockRef.current)
            setAmountLockRef.current(false);
        return res;
    }, [props.quote, signer]);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const [paymentError, setPaymentError] = useState(null);
    const retryWaitForPayment = useCallback((signal) => {
        setPaymentError(null);
        props.quote.waitForPayment(signal ?? abortSignalRef.current, 2).catch(err => {
            if ((signal ?? abortSignalRef.current).aborted)
                return;
            setPaymentError(err.message);
        });
    }, [props.quote]);
    //Check if we should display any warnings in CREATED state
    useEffect(() => {
        const abortController = new AbortController();
        if (state === ToBTCSwapState.COMMITED) {
            retryWaitForPayment(abortController.signal);
        }
        return () => abortController.abort();
    }, [state]);
    //Checks the balance of the signer in the CREATED state
    const [notEnoughBalanceError, setNotEnoughBalanceError] = useState(null);
    useEffect(() => {
        setNotEnoughBalanceError(null);
        let cancelled = false;
        if (props.quote == null || state !== ToBTCSwapState.CREATED || signer == null)
            return;
        props.quote.hasEnoughBalance().then(result => {
            if (cancelled)
                return;
            console.log("Quote hasEnoughBalance(): Balance: " + result.balance.amount + " Required: " + result.required.amount + " Enough: " + result.enoughBalance);
            if (!result.enoughBalance) {
                setNotEnoughBalanceError("You don't have enough funds to initiate the swap, balance: " + result.balance.amount + " " + result.balance.token.ticker);
                return;
            }
        });
        return () => {
            cancelled = true;
        };
    }, [state, signer]);
    const feeNeeded = useMemo(() => {
        if (props.notEnoughForGas == null || props.quote == null || swapper == null)
            return null;
        const nativeToken = swapper.getNativeToken(props.quote.chainIdentifier);
        const amount = props.notEnoughForGas;
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, nativeToken),
            nativeToken
        };
    }, [props.notEnoughForGas, props.quote, swapper]);
    const isCreated = state === ToBTCSwapState.CREATED ||
        (state === ToBTCSwapState.QUOTE_SOFT_EXPIRED && continueLoading);
    const isExpired = state === ToBTCSwapState.QUOTE_EXPIRED ||
        (state === ToBTCSwapState.QUOTE_SOFT_EXPIRED && !continueLoading);
    const isPaying = state === ToBTCSwapState.COMMITED && paymentError == null;
    const isPayError = state === ToBTCSwapState.COMMITED && paymentError != null;
    const isSuccess = state === ToBTCSwapState.CLAIMED || state === ToBTCSwapState.SOFT_CLAIMED;
    const isRefundable = state === ToBTCSwapState.REFUNDABLE && !refundLoading;
    const isRefunding = state === ToBTCSwapState.REFUNDABLE && refundLoading;
    const isRefunded = state === ToBTCSwapState.REFUNDED;
    useEffect(() => {
        if (isExpired || isSuccess || isRefunded) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isExpired, isSuccess, isRefunded]);
    const executionSteps = [
        { icon: ic_check_circle_outline, text: "Init transaction confirmed", type: "success" }
    ];
    if (isCreated && !continueLoading)
        executionSteps[0] = { icon: ic_play_circle_outline, text: "Send init transaction", type: "loading" };
    if (isCreated && continueLoading)
        executionSteps[0] = { icon: ic_hourglass_empty_outline, text: "Sending init transaction", type: "loading" };
    if (isExpired)
        executionSteps[0] = { icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed" };
    if (props.quote.getType() === SwapType.TO_BTCLN) {
        executionSteps[1] = { icon: ic_flash_on_outline, text: "Lightning payout", type: "disabled" };
        if (isPaying || isPayError)
            executionSteps[1] = { icon: ic_hourglass_top_outline, text: "Sending lightning payout", type: "loading" };
        if (isSuccess)
            executionSteps[1] = { icon: ic_verified_outline, text: "Lightning payout success", type: "success" };
        if (isRefundable || isRefunding || isRefunded)
            executionSteps[1] = { icon: ic_error_outline_outline, text: "Lightning payout failed", type: "failed" };
    }
    else {
        executionSteps[1] = { icon: bitcoin, text: "Bitcoin payout", type: "disabled" };
        if (isPaying || isPayError)
            executionSteps[1] = { icon: ic_hourglass_top_outline, text: "Sending bitcoin payout", type: "loading" };
        if (isSuccess)
            executionSteps[1] = { icon: ic_verified_outline, text: "Bitcoin payout success", type: "success" };
        if (isRefundable || isRefunding || isRefunded)
            executionSteps[1] = { icon: ic_error_outline_outline, text: "Bitcoin payout failed", type: "failed" };
    }
    if (isRefundable)
        executionSteps[2] = { icon: ic_settings_backup_restore_outline, text: "Refundable", type: "loading" };
    if (isRefunding)
        executionSteps[2] = { icon: ic_hourglass_empty_outline, text: "Sending refund transaction", type: "loading" };
    if (isRefunded)
        executionSteps[2] = { icon: ic_check_circle_outline, text: "Refunded", type: "success" };
    return (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: isCreated && confidenceWarning, variant: "warning", children: [_jsx("strong", { children: "Payment might likely fail!" }), _jsx("label", { children: "We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!" })] }), _jsxs(Alert, { className: "text-center mb-3", show: isCreated && nonCustodialWarning && props.type === "swap", variant: "success", children: [_jsx("strong", { children: "Non-custodial wallet info" }), _jsx("label", { children: "Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!" })] }), isInitiated ? _jsx(StepByStep, { steps: executionSteps }) : "", _jsxs(Alert, { className: "text-center mb-3", show: !!notEnoughBalanceError, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough funds" }), _jsx("label", { children: notEnoughBalanceError })] }), _jsx(SwapExpiryProgressBar, { expired: isExpired, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: (isExpired || isCreated) && !continueLoading && !props.notEnoughForGas && signer !== undefined && !notEnoughBalanceError }), _jsx(ErrorAlert, { className: "mb-3", title: "Swap initialization error", error: continueError }), ((isCreated && !notEnoughBalanceError) ||
                isPaying) ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: !!props.notEnoughForGas, variant: "danger", closeVariant: "white", children: [_jsxs("strong", { children: ["Not enough ", feeNeeded?.nativeToken?.ticker, " for fees"] }), _jsxs("label", { children: ["You need at least ", feeNeeded?.amount, " ", feeNeeded?.nativeToken?.ticker, " to pay for fees and deposits!"] })] }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: () => onContinue(), disabled: isPaying || continueLoading || !!props.notEnoughForGas, size: "lg", children: [isPaying || continueLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", props.type === "payment" ? "Pay" : "Swap"] })] }))) : "", isPayError ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap error", error: paymentError }), _jsx(Button, { onClick: () => retryWaitForPayment(), variant: "secondary", children: "Retry" })] })) : "", isSuccess ? (_jsxs(Alert, { variant: "success", className: props.type === "payment" ? "mb-0" : "mb-3", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" }), props.quote.getType() === SwapType.TO_BTC ? (_jsx(Button, { href: FEConstants.btcBlockExplorer + props.quote.getBitcoinTxId(), target: "_blank", variant: "success", className: "mt-3", children: "View transaction" })) : ""] })) : "", isRefundable || isRefunding ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap failed, you can refund your prior deposit" })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Refund error", error: refundError }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: onRefund, disabled: refundLoading, variant: "secondary", children: [refundLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Refund deposit"] })] })) : "", _jsxs(Alert, { variant: "danger", className: "mb-3", show: isRefunded, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Funds refunded successfully!" })] }), (isRefunded ||
                isExpired ||
                !!notEnoughBalanceError ||
                (isSuccess && props.type !== "payment")) ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : ""] }));
}
