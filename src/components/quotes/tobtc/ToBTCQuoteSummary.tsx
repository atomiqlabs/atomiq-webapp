import * as React from "react";
import {useCallback, useContext, useEffect, useState} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {IToBTCSwap, SwapType, ToBTCLNSwap, ToBTCSwap, ToBTCSwapState} from "@atomiqlabs/sdk";
import {toHumanReadableString} from "../../../utils/Currencies";
import * as bolt11 from "bolt11";
import * as BN from "bn.js";
import {FEConstants} from "../../../FEConstants";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";
import {useSwapState} from "../../../utils/useSwapState";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";
import {useAsync} from "../../../utils/useAsync";
import {useAbortSignalRef} from "../../../utils/useAbortSignal";
import {useStateRef} from "../../../utils/useStateRef";

import {ic_settings_backup_restore_outline} from 'react-icons-kit/md/ic_settings_backup_restore_outline'
import {ic_error_outline_outline} from 'react-icons-kit/md/ic_error_outline_outline'
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../StepByStep";


const SNOWFLAKE_LIST: Set<string> = new Set([
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

export function ToBTCQuoteSummary(props: {
    quote: IToBTCSwap,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    balance?: BN,
    autoContinue?: boolean,
    notEnoughForGas: BN
}) {
    const {swapper, getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const {state, totalQuoteTime, quoteTimeRemaining} = useSwapState(props.quote);

    const [confidenceWarning, setConfidenceWarning] = useState<boolean>(false);
    const [nonCustodialWarning, setNonCustodialWarning] = useState<boolean>(false);

    const setAmountLockRef = useStateRef(props.setAmountLock);

    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync(
        (skipChecks?: boolean) => {
            if(setAmountLockRef.current) setAmountLockRef.current(true);
            return props.quote.commit(signer, null, null, skipChecks).catch(err => {
                if(setAmountLockRef.current) setAmountLockRef.current(false);
                throw err;
            });
        },
        [props.quote, signer]
    );

    const [onRefund, refundLoading, refundSuccess, refundError] = useAsync(async () => {
        const res = await props.quote.refund(signer);
        if(setAmountLockRef.current) setAmountLockRef.current(false);
        return res;
    }, [props.quote, signer]);

    const abortSignalRef = useAbortSignalRef([props.quote]);

    const [paymentError, setPaymentError] = useState<string>(null);
    const retryWaitForPayment = useCallback((signal?: AbortSignal) => {
        setPaymentError(null);
        props.quote.waitForPayment(signal ?? abortSignalRef.current, 2).catch(err => {
            if((signal ?? abortSignalRef.current).aborted) return;
            setPaymentError(err.message);
        });
    }, [props.quote]);

    //Check if we should display any warnings in CREATED state
    useEffect(() => {
        const abortController = new AbortController();

        if(state===ToBTCSwapState.CREATED && props.quote.getType()===SwapType.TO_BTCLN) {
            const _quote = props.quote as ToBTCLNSwap;
            if(_quote.getConfidence()===0) {
                let isSnowflake: boolean = false;
                let isNonCustodial: boolean = false;

                const parsedRequest = bolt11.decode(_quote.getLightningInvoice());

                if(parsedRequest.tagsObject.routing_info!=null) {
                    for (let route of parsedRequest.tagsObject.routing_info) {
                        isNonCustodial = true;
                        if (SNOWFLAKE_LIST.has(route.pubkey)) {
                            isSnowflake = true;
                        }
                    }
                }

                if(confidenceWarning===isSnowflake) setConfidenceWarning(!isSnowflake);
                setNonCustodialWarning(!confidenceWarning && isNonCustodial);
            }
        }

        if(state===ToBTCSwapState.COMMITED) {
            retryWaitForPayment(abortController.signal);
        }

        if(state===ToBTCSwapState.SOFT_CLAIMED || state===ToBTCSwapState.CLAIMED || state===ToBTCSwapState.REFUNDED) {
            console.log("ToBTCQuoteSummary: useEffect(state): Swap finished!");
            if(setAmountLockRef.current!=null) {
                console.log("ToBTCQuoteSummary: useEffect(state): Call unlock");
                setAmountLockRef.current(false);
            }
        }

        return () => abortController.abort();
    }, [state]);

    //Checks the balance of the signer in the CREATED state
    const [notEnoughBalanceError, setNotEnoughBalanceError] = useState<string>(null);
    useEffect(() => {
        setNotEnoughBalanceError(null);
        let cancelled = false;

        if(state===ToBTCSwapState.CREATED && signer!=null) {
            //Check that we have enough funds!
            const swapInput = props.quote.getInput();

            if(props.balance===null) return;

            let balancePromise: Promise<BN>;
            if(props.balance===undefined) {
                balancePromise = swapper.getBalance(signer.getAddress(), swapInput.token);
            } else {
                balancePromise = Promise.resolve(props.balance);
            }

            balancePromise.then(balance => {
                if(cancelled) return;
                const hasEnoughBalance = balance.gte(swapInput.rawAmount);

                if(!hasEnoughBalance) {
                    setNotEnoughBalanceError("You don't have enough funds to initiate the swap, balance: "+toHumanReadableString(balance, swapInput.token)+" "+swapInput.token.ticker);
                    return;
                }

                if(props.autoContinue) onContinue(true);
            });
        }

        return () => {
            cancelled = true;
        }
    }, [state, signer, props.balance]);

    const isCreated = state===ToBTCSwapState.CREATED ||
        (state===ToBTCSwapState.QUOTE_SOFT_EXPIRED && continueLoading);
    const isExpired = state===ToBTCSwapState.QUOTE_EXPIRED ||
        (state===ToBTCSwapState.QUOTE_SOFT_EXPIRED && !continueLoading);
    const isPaying = state===ToBTCSwapState.COMMITED && paymentError==null;
    const isPayError = state===ToBTCSwapState.COMMITED && paymentError!=null;
    const isSuccess = state===ToBTCSwapState.CLAIMED || state===ToBTCSwapState.SOFT_CLAIMED;
    const isRefundable = state===ToBTCSwapState.REFUNDABLE && !refundLoading;
    const isRefunding = state===ToBTCSwapState.REFUNDABLE && refundLoading;
    const isRefunded = state===ToBTCSwapState.REFUNDED;

    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Init transaction confirmed", type: "success"}
    ];
    if(isCreated) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Sending init transaction", type: "loading"};
    if(isExpired) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};
    if(props.quote.getType()===SwapType.TO_BTCLN) {
        executionSteps[1] = {icon: ic_flash_on_outline, text: "Lightning payout", type: "disabled"};
        if(isPaying || isPayError) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Sending lightning payout", type: "loading"};
        if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Lightning payout success", type: "success"};
        if(isRefundable || isRefunding || isRefunded) executionSteps[1] = {icon: ic_error_outline_outline, text: "Lightning payout failed", type: "failed"};
    } else {
        executionSteps[1] = {icon: bitcoin, text: "Bitcoin payout", type: "disabled"};
        if(isPaying || isPayError) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Sending bitcoin payout", type: "loading"};
        if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Bitcoin payout success", type: "success"};
        if(isRefundable || isRefunding || isRefunded) executionSteps[1] = {icon: ic_error_outline_outline, text: "Bitcoin payout failed", type: "failed"};
    }
    if(isRefundable) executionSteps[2] = {icon: ic_settings_backup_restore_outline, text: "Refundable", type: "loading"};
    if(isRefunding) executionSteps[2] = {icon: ic_hourglass_empty_outline, text: "Sending refund transaction", type: "loading"};
    if(isRefunded) executionSteps[2] = {icon: ic_check_circle_outline, text: "Refunded", type: "success"};

    return (
        <>
            <Alert className="text-center mb-3" show={!continueSuccess && confidenceWarning} variant="warning" onClose={() => setConfidenceWarning(false)} dismissible closeVariant="white">
                <strong>Payment might likely fail!</strong>
                <label>We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!</label>
            </Alert>

            <Alert className="text-center mb-3" show={!continueSuccess && nonCustodialWarning && props.type==="swap"} variant="success" onClose={() => setNonCustodialWarning(false)} dismissible closeVariant="white">
                <strong>Non-custodial wallet info</strong>
                <label>Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!</label>
            </Alert>

            {(!isCreated || continueLoading) && !isExpired ? <StepByStep steps={executionSteps}/> : ""}

            <Alert className="text-center mb-3" show={!!notEnoughBalanceError} variant="danger" closeVariant="white">
                <strong>Not enough funds</strong>
                <label>{notEnoughBalanceError}</label>
            </Alert>

            <SwapExpiryProgressBar
                expired={isExpired}
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={(isExpired || isCreated) && !continueLoading && !props.notEnoughForGas && signer!==undefined && !notEnoughBalanceError}
            />

            {(
                (isCreated && !notEnoughBalanceError) ||
                isPaying
            ) ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <Alert className="text-center mb-3" show={!!props.notEnoughForGas} variant="danger" closeVariant="white">
                            <strong>Not enough SOL for fees</strong>
                            <label>You need at least 0.005 SOL to pay for fees and deposits!</label>
                        </Alert>

                        <Alert className="text-center mb-3" show={continueError!=null} variant="danger" closeVariant="white">
                            <strong>Swap initialization error</strong>
                            <label>{continueError?.message}</label>
                        </Alert>

                        <ButtonWithSigner
                            signer={signer}
                            chainId={props.quote.chainIdentifier}
                            onClick={() => onContinue()}
                            disabled={state===ToBTCSwapState.COMMITED || continueLoading || !!props.notEnoughForGas}
                            size="lg"
                        >
                            {state===ToBTCSwapState.COMMITED || continueLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            {props.type==="payment" ? "Pay" : "Swap"}
                        </ButtonWithSigner>
                    </>
                )
            ) : ""}

            {isPayError ? (
                <>
                    <Alert className="text-center mb-3" variant="danger" closeVariant="white">
                        <strong>Swap error</strong>
                        <label>{paymentError}</label>
                    </Alert>

                    <Button onClick={() => retryWaitForPayment()} variant="secondary">Retry</Button>
                </>
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className={props.type==="payment" ? "mb-0" : "mb-3"}>
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                    {props.quote.getType()===SwapType.TO_BTC ? (
                        <Button
                            href={FEConstants.btcBlockExplorer+(props.quote as ToBTCSwap).getBitcoinTxId()}
                            target="_blank" variant="success" className="mt-3"
                        >View transaction</Button>
                    ) : ""}
                </Alert>
            ) : ""}

            {isRefundable || isRefunding ? (
                <>
                    <Alert variant="danger" className="mb-3">
                        <strong>Swap failed</strong>
                        <label>Swap failed, you can refund your prior deposit</label>
                    </Alert>
                    <ButtonWithSigner signer={signer} chainId={props.quote.chainIdentifier} onClick={onRefund} disabled={refundLoading} variant="secondary">
                        {refundLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Refund deposit
                    </ButtonWithSigner>
                </>
            ) : ""}

            <Alert variant="danger" className="mb-3" show={isRefunded}>
                <strong>Swap failed</strong>
                <label>Deposit refunded successfully!</label>
            </Alert>

            {(
                isRefunded ||
                isExpired ||
                !!notEnoughBalanceError ||
                (isSuccess && props.type!=="payment")
            ) ? (
                <Button onClick={props.refreshQuote} variant="secondary">New quote</Button>
            ) : ""}

        </>
    )
}