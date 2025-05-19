import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";
import {Alert, Badge, Button, Spinner} from "react-bootstrap";
import {SpvFromBTCSwap, SpvFromBTCSwapState} from "@atomiqlabs/sdk";
import {getDeltaText} from "../../utils/Utils";
import {FEConstants} from "../../FEConstants";
import {ButtonWithWallet} from "../../wallets/ButtonWithWallet";
import {useSwapState} from "../hooks/useSwapState";
import {useAsync} from "../../utils/hooks/useAsync";
import {SwapExpiryProgressBar} from "../components/SwapExpiryProgressBar";

import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../components/StepByStep";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {useAbortSignalRef} from "../../utils/hooks/useAbortSignal";
import {ErrorAlert} from "../../components/ErrorAlert";
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ChainDataContext} from "../../wallets/context/ChainDataContext";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";

/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */

export function SpvVaultFromBTCQuoteSummary(props: {
    quote: SpvFromBTCSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    feeRate?: number,
    balance?: bigint
}) {
    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const isAlreadyClaimable = useMemo(() => props.quote?.isClaimable(), [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);

    const bitcoinWallet = useContext(ChainDataContext)?.BITCOIN?.wallet;
    const smartChainWallet = useSmartChainWallet(props.quote);

    const [onSend, sendLoading, sendSuccess, sendError] = useAsync(() => {
        if(setAmountLockRef.current!=null) {
            console.log("SpvVaultFromBTCQuoteSummary: onSend(): setting amount lock to true");
            setAmountLockRef.current(true);
        }
        return props.quote.sendBitcoinTransaction(bitcoinWallet.instance, Math.max(props.feeRate, props.quote.minimumBtcFeeRate)).catch(e => {
            if(setAmountLockRef.current!=null) {
                console.log("SpvVaultFromBTCQuoteSummary: onSend(): signAndSubmit failed - setting amount lock to false");
                setAmountLockRef.current(false);
            }
            throw e;
        });
    }, [props.quote, bitcoinWallet, props.feeRate]);

    const abortSignalRef = useAbortSignalRef([props.quote]);

    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
        return props.quote.waitForBitcoinTransaction(
            abortSignalRef.current, null,
            (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
                if(txId==null) {
                    setTxData(null);
                    return;
                }
                setTxData({
                    txId,
                    confirmations,
                    confTarget: confirmationTarget,
                    txEtaMs
                });
            }
        );
    }, [props.quote]);

    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return props.quote.claim(smartChainWallet.instance);
    }, [props.quote, smartChainWallet]);

    const [txData, setTxData] = useState<{
        txId: string,
        confirmations: number,
        confTarget: number,
        txEtaMs: number
    }>(null);

    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if(state===SpvFromBTCSwapState.POSTED || state===SpvFromBTCSwapState.BROADCASTED) {
            onWaitForPayment();
        }

        let timer: NodeJS.Timeout = null;
        if(state===SpvFromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 60*1000);
        }

        return () => {
            if(timer!=null) clearTimeout(timer);
            setClaimable(false);
        }
    }, [state]);

    const hasEnoughBalance = useMemo(
        () => props.balance==null || props.quote==null ? true : props.balance >= props.quote.getInput().rawAmount,
        [props.balance, props.quote]
    );

    const isQuoteExpired = state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
        (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && !sendLoading && !waitingPayment);
    const isCreated = state===SpvFromBTCSwapState.CREATED ||
        (state===SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && sendLoading);
    const isSending = state === SpvFromBTCSwapState.CREATED && sendLoading;
    const isBroadcasting = state === SpvFromBTCSwapState.SIGNED || state === SpvFromBTCSwapState.POSTED || (state === SpvFromBTCSwapState.BROADCASTED && txData == null);
    const isReceived = state === SpvFromBTCSwapState.BROADCASTED && txData != null;
    const isClaimable = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isFailed = state===SpvFromBTCSwapState.FAILED || state===SpvFromBTCSwapState.DECLINED || state===SpvFromBTCSwapState.CLOSED;
    const isSuccess = state===SpvFromBTCSwapState.CLAIMED || state===SpvFromBTCSwapState.FRONTED;

    useEffect(() => {
        if(isSuccess || isFailed || isQuoteExpired) {
            console.log("SpvVaultFromBTCQuoteSummary: useEffect(state): setting amount lock to false");
            if (setAmountLockRef.current != null) setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isQuoteExpired]);

    /*
    Steps:
    1. Bitcoin payment -> Signing bitcoin transaction -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
    2. Claim transaction -> Sending claim transaction -> Claim success
     */
    const executionSteps: SingleStep[] = [
        {icon: bitcoin, text: "Bitcoin payment", type: "loading"},
        {icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "disabled"},
    ];

    if(isSending) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Signing bitcoin transaction", type: "loading"};
    if(isBroadcasting) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Broadcasting bitcoin transaction", type: "loading"};
    if(isReceived) executionSteps[0] = {icon: ic_hourglass_top_outline, text: "Waiting bitcoin confirmations", type: "loading"};
    if(isQuoteExpired) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};
    if(isClaimable || isClaiming || isSuccess) executionSteps[0] = {icon: ic_check_circle_outline, text: "Bitcoin confirmed", type: "success"};
    if(isFailed) executionSteps[0] = {icon: ic_refresh, text: "Bitcoin payment reverted", type: "failed"};

    if(isClaimable) executionSteps[1] = {icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "loading"};
    if(isClaiming) executionSteps[1] = {icon: ic_hourglass_empty_outline, text: "Sending claim transaction", type: "loading"};
    if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Claim success", type: "success"};

    return (
        <>
            {isInitiated || (isCreated && sendLoading) ? <StepByStep steps={executionSteps}/> : ""}

            <SwapExpiryProgressBar
                expired={isQuoteExpired}
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={(isCreated || isQuoteExpired) && !sendLoading && bitcoinWallet!=null && hasEnoughBalance}
            />

            {isCreated ? (
                <>
                    <ErrorAlert className="mb-3" title="Sending BTC failed" error={sendError}/>

                    <ButtonWithWallet
                        chainId="BITCOIN"
                        onClick={onSend}
                        disabled={sendLoading || !hasEnoughBalance}
                        size="lg"
                        className="d-flex flex-row"
                    >
                        {sendLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Pay with <img width={20} height={20} src={bitcoinWallet?.icon} className="ms-2 me-1"/> {bitcoinWallet?.name}
                    </ButtonWithWallet>
                </>
            ) : ""}

            {isBroadcasting ? (
                <div className="d-flex flex-column align-items-center tab-accent">
                    <Spinner/>
                    <small className="mt-2">Sending bitcoin transaction...</small>
                </div>
            ) : ""}

            {isReceived ? (
                <div className="d-flex flex-column align-items-center tab-accent">
                    <small className="mb-2">Transaction successfully received, waiting for confirmations...</small>

                    <Spinner/>
                    <label>{txData.confirmations} / {txData.confTarget}</label>
                    <label style={{marginTop: "-6px"}}>Confirmations</label>

                    <a
                        className="mb-2 text-overflow-ellipsis text-nowrap overflow-hidden"
                        style={{width: "100%"}}
                        target="_blank"
                        href={FEConstants.btcBlockExplorer + txData.txId}
                    ><small>{txData.txId}</small></a>

                    <Badge
                        className={"text-black"+(txData.txEtaMs==null ? " d-none" : "")} bg="light" pill
                    >ETA: {txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)}</Badge>

                    {waitPaymentError!=null ? (
                        <>
                            <ErrorAlert className="my-3 width-fill" title="Wait payment error" error={waitPaymentError}/>
                            <Button onClick={onWaitForPayment} className="width-fill" variant="secondary">
                                Retry
                            </Button>
                        </>
                    ) : ""}
                </div>
            ) : ""}

            {isClaimable && !(claimable || isAlreadyClaimable) ? (
                <div className="d-flex flex-column align-items-center tab-accent">
                    <Spinner/>
                    <small className="mt-2">Transaction received & confirmed, waiting for claim by watchtowers...</small>
                </div>
            ) : ""}

            {(isClaimable || isClaiming) && (claimable || isAlreadyClaimable) ? (
                <>
                    <div className="d-flex flex-column align-items-center tab-accent mb-3">
                        <label>Transaction received & confirmed, you can claim your funds manually now!</label>
                    </div>

                    <ErrorAlert className="mb-3" title="Claim error" error={claimError}/>

                    <ButtonWithWallet
                        chainId={props.quote.chainIdentifier}
                        onClick={onClaim} disabled={claimLoading} size="lg"
                    >
                        {claimLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Finish swap (claim funds)
                    </ButtonWithWallet>
                </>
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className="mb-3">
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                </Alert>
            ) : ""}

            {isFailed ? (
                <Alert variant="danger" className="mb-3">
                    <strong>Swap failed</strong>
                    <label>Swap transaction reverted, no funds were sent!</label>
                </Alert>
            ) : ""}

            {(
                isQuoteExpired ||
                isFailed ||
                isSuccess
            ) ? (
                <Button onClick={props.refreshQuote} variant="secondary">
                    New quote
                </Button>
            ) : ""}

        </>
    )
}