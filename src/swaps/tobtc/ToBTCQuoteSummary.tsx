import * as React from "react";
import {useContext, useEffect, useMemo} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {
    AbstractSigner,
    IToBTCSwap,
    SwapType,
    ToBTCLNSwap,
    ToBTCSwapState,
    toHumanReadableString
} from "@atomiqlabs/sdk";
import {FEConstants} from "../../FEConstants";
import {SwapsContext} from "../context/SwapsContext";
import {ButtonWithWallet} from "../../wallets/ButtonWithWallet";
import {useSwapState} from "../hooks/useSwapState";
import {SwapExpiryProgressBar} from "../components/SwapExpiryProgressBar";
import {useAsync} from "../../utils/hooks/useAsync";
import {useAbortSignalRef} from "../../utils/hooks/useAbortSignal";
import {useStateRef} from "../../utils/hooks/useStateRef";

import {ic_play_circle_outline} from 'react-icons-kit/md/ic_play_circle_outline';
import {ic_settings_backup_restore_outline} from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import {ic_error_outline_outline} from 'react-icons-kit/md/ic_error_outline_outline';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../components/StepByStep";
import {ErrorAlert} from "../../components/ErrorAlert";
import {useWithAwait} from "../../utils/hooks/useWithAwait";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";

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
    autoContinue?: boolean,
    notEnoughForGas: bigint
}) {
    const {swapper} = useContext(SwapsContext);
    const wallet = useSmartChainWallet(props.quote);
    const signer: AbstractSigner = wallet?.address===props.quote._getInitiator() ? wallet.instance : null;

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const [nonCustodialWarning, confidenceWarning] = useMemo(() => {
        if(props.quote instanceof ToBTCLNSwap) {
            return [props.quote.isPayingToNonCustodialWallet(), props.quote.willLikelyFail()]
        }
        return [false, false];
    }, [props.quote]);

    const setAmountLockRef = useStateRef(props.setAmountLock);

    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync(
        (skipChecks?: boolean) => {
            if(setAmountLockRef.current) setAmountLockRef.current(true);
            return props.quote.commit(signer, null, skipChecks).catch(err => {
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

    const [retryWaitForPayment, _, __, paymentError] = useAsync(async () => {
        try {
            await props.quote.waitForPayment(abortSignalRef.current, 2);
        } catch (e) {
            if(abortSignalRef.current.aborted) return;
            throw e;
        }
    }, [props.quote]);

    useEffect(() => {
        const abortController = new AbortController();
        if(state===ToBTCSwapState.COMMITED) retryWaitForPayment();
        return () => abortController.abort();
    }, [state]);

    //Checks the balance of the signer in the CREATED state
    const [notEnoughBalanceError] = useWithAwait(async (swap: IToBTCSwap, signer: AbstractSigner, state: ToBTCSwapState) => {
        if(swap==null || signer==null || state!==ToBTCSwapState.CREATED) return;

        const resp = await swap.hasEnoughBalance();
        if(!resp.enoughBalance)
            return "You don't have enough funds to initiate the swap, balance: "+resp.balance.amount+" "+resp.balance.token.ticker;
    }, [props.quote, signer, state]);

    const feeNeeded = useMemo(() => {
        if(props.notEnoughForGas==null || props.quote==null || swapper==null) return null;
        const nativeToken = swapper.Utils.getNativeToken(props.quote.chainIdentifier);
        const amount = props.notEnoughForGas;
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, nativeToken),
            nativeToken
        }
    }, [props.notEnoughForGas, props.quote, swapper]);

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

    useEffect(() => {
        if(isExpired || isSuccess || isRefunded) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        }
    }, [isExpired, isSuccess, isRefunded]);

    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Init transaction confirmed", type: "success"}
    ];
    if(isCreated && !continueLoading) executionSteps[0] = {icon: ic_play_circle_outline, text: "Send init transaction", type: "loading"};
    if(isCreated && continueLoading) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Sending init transaction", type: "loading"};
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
            <Alert className="text-center mb-3" show={isCreated && confidenceWarning} variant="warning">
                <strong>Payment might likely fail!</strong>
                <label>We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!</label>
            </Alert>

            <Alert className="text-center mb-3" show={isCreated && nonCustodialWarning && props.type==="swap"} variant="success">
                <strong>Non-custodial wallet info</strong>
                <label>Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!</label>
            </Alert>

            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

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

            <ErrorAlert className="mb-3" title="Swap initialization error" error={continueError}/>

            {(
                (isCreated && !notEnoughBalanceError) ||
                isPaying
            ) ? (
                <>
                    <Alert className="text-center mb-3" show={!!props.notEnoughForGas && signer!=null} variant="danger" closeVariant="white">
                        <strong>Not enough {feeNeeded?.nativeToken?.ticker} for fees</strong>
                        <label>You need at least {feeNeeded?.amount} {feeNeeded?.nativeToken?.ticker} to pay for fees and deposits!</label>
                    </Alert>

                    <ButtonWithWallet
                        requiredWalletAddress={props.quote._getInitiator()}
                        chainId={props.quote.chainIdentifier}
                        onClick={() => onContinue()}
                        disabled={isPaying || continueLoading || !!props.notEnoughForGas}
                        size="lg"
                    >
                        {isPaying || continueLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        {props.type==="payment" ? "Pay" : "Swap"}
                    </ButtonWithWallet>
                </>
            ) : ""}

            {isPayError ? (
                <>
                    <ErrorAlert className="mb-3" title="Swap error" error={paymentError}/>

                    <Button onClick={() => retryWaitForPayment()} variant="secondary">Retry</Button>
                </>
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className={props.type==="payment" ? "mb-0" : "mb-3"}>
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                    {props.quote.getType()===SwapType.TO_BTC ? (
                        <Button
                            href={FEConstants.btcBlockExplorer+props.quote.getOutputTxId()}
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

                    <ErrorAlert className="mb-3" title="Refund error" error={refundError}/>

                    <ButtonWithWallet requiredWalletAddress={props.quote._getInitiator()} chainId={props.quote.chainIdentifier} onClick={onRefund} disabled={refundLoading} variant="secondary">
                        {refundLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Refund deposit
                    </ButtonWithWallet>
                </>
            ) : ""}

            <Alert variant="danger" className="mb-3" show={isRefunded}>
                <strong>Swap failed</strong>
                <label>Funds refunded successfully!</label>
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