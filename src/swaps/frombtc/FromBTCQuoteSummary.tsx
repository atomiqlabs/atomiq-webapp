import * as React from "react";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Badge, Button, Spinner} from "react-bootstrap";
import {QRCodeSVG} from "qrcode.react";
import ValidatedInput, {ValidatedInputRef} from "../../components/ValidatedInput";
import {FromBTCSwap, FromBTCSwapState} from "@atomiqlabs/sdk";
import Icon from "react-icons-kit";
import {clipboard} from "react-icons-kit/fa/clipboard";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import {getDeltaText} from "../../utils/Utils";
import {FEConstants, Tokens} from "../../FEConstants";
import {ButtonWithWallet} from "../../wallets/ButtonWithWallet";
import {ScrollAnchor} from "../../components/ScrollAnchor";
import {CopyOverlay} from "../../components/CopyOverlay";
import {useSwapState} from "../hooks/useSwapState";
import {useAsync} from "../../utils/hooks/useAsync";
import {SwapExpiryProgressBar} from "../components/SwapExpiryProgressBar";
import {SwapForGasAlert} from "../components/SwapForGasAlert";

import {ic_gavel_outline} from 'react-icons-kit/md/ic_gavel_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_pending_outline} from 'react-icons-kit/md/ic_pending_outline';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../components/StepByStep";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {useAbortSignalRef} from "../../utils/hooks/useAbortSignal";
import {OnchainAddressCopyModal} from "../components/OnchainAddressCopyModal";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {ErrorAlert} from "../../components/ErrorAlert";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";
import {ChainDataContext} from "../../wallets/context/ChainDataContext";

/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCQuoteSummary(props: {
    quote: FromBTCSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    notEnoughForGas: bigint,
    feeRate?: number,
    balance?: bigint
}) {
    const bitcoinChainData = useContext(ChainDataContext).BITCOIN;
    const smartChainWallet = useSmartChainWallet(props.quote, true);

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);

    const [payBitcoin, payLoading, payTxId, payError] = useAsync(
        () => props.quote.sendBitcoinTransaction(bitcoinChainData.wallet.instance, props.feeRate===0 ? null : props.feeRate),
        [bitcoinChainData.wallet, props.feeRate, props.quote]
    );

    const isAlreadyClaimable = useMemo(
        () => props.quote!=null ? props.quote.isClaimable() : false,
        [props.quote]
    );
    const setAmountLockRef = useStateRef(props.setAmountLock);

    const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(async () => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);

        const commitTxId = await props.quote.commit(smartChainWallet.instance).catch(e => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw e;
        });

        if(bitcoinChainData.wallet!=null) payBitcoin();
        return commitTxId;
    }, [props.quote, smartChainWallet, payBitcoin]);

    const abortSignalRef = useAbortSignalRef([props.quote]);

    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(
        () => props.quote.waitForBitcoinTransaction(
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
        ),
        [props.quote]
    );

    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return props.quote.claim(smartChainWallet.instance);
    }, [props.quote, smartChainWallet]);

    const textFieldRef = useRef<ValidatedInputRef>();
    const openModalRef = useRef<() => void>(null);

    const [txData, setTxData] = useState<{
        txId: string,
        confirmations: number,
        confTarget: number,
        txEtaMs: number
    }>(null);

    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if(state===FromBTCSwapState.CLAIM_COMMITED || state===FromBTCSwapState.EXPIRED) {
            onWaitForPayment();
        }

        let timer: NodeJS.Timeout = null;
        if(state===FromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 20*1000);
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

    const isQuoteExpired = state === FromBTCSwapState.QUOTE_EXPIRED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && !commitLoading);
    const isCreated = state===FromBTCSwapState.PR_CREATED ||
        (state===FromBTCSwapState.QUOTE_SOFT_EXPIRED && commitLoading);
    const isCommited = state === FromBTCSwapState.CLAIM_COMMITED && txData==null;
    const isReceived = state === (FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) && txData != null;
    const isClaimable = state === FromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === FromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isExpired = state===FromBTCSwapState.EXPIRED && txData==null;
    const isFailed = state===FromBTCSwapState.FAILED;
    const isSuccess = state===FromBTCSwapState.CLAIM_CLAIMED;

    useEffect(() => {
        if(isSuccess || isFailed || isExpired || isQuoteExpired) {
            if (setAmountLockRef.current != null) setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isExpired, isQuoteExpired]);

    /*
    Steps:
    1. Opening swap address -> Swap address opened
    2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
    3. Claim transaction -> Sending claim transaction -> Claim success
     */
    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Swap address opened", type: "success"},
        {icon: bitcoin, text: "Bitcoin payment", type: "disabled"},
        {icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "disabled"},
    ];

    if(isCreated && !commitLoading) executionSteps[0] = {icon: ic_gavel_outline, text: "Open swap address", type: "loading"};
    if(isCreated && commitLoading) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Opening swap address", type: "loading"};
    if(isQuoteExpired) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};

    if(isCommited) executionSteps[1] = {icon: ic_pending_outline, text: "Awaiting bitcoin payment", type: "loading"};
    if(isReceived) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Waiting bitcoin confirmations", type: "loading"};
    if(isClaimable || isClaiming || isSuccess) executionSteps[1] = {icon: ic_check_circle_outline, text: "Bitcoin confirmed", type: "success"};
    if(isExpired || isFailed) executionSteps[1] = {icon: ic_watch_later_outline, text: "Swap expired", type: "failed"};

    if(isClaimable) executionSteps[2] = {icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "loading"};
    if(isClaiming) executionSteps[2] = {icon: ic_hourglass_empty_outline, text: "Sending claim transaction", type: "loading"};
    if(isSuccess) executionSteps[2] = {icon: ic_verified_outline, text: "Claim success", type: "success"};

    const [_, setShowCopyWarning, showCopyWarningRef] = useLocalStorage("crossLightning-copywarning", true);
    const addressContent = useCallback((show) => (
        <>
            <Alert variant="warning" className="mb-3">
                <label>Please make sure that you send an <b><u>EXACT</u></b> amount in BTC, different amount wouldn't be accepted and you might lose funds!</label>
            </Alert>

            <div className="mb-2">
                <QRCodeSVG
                    value={props.quote.getHyperlink()}
                    size={300}
                    includeMargin={true}
                    className="cursor-pointer"
                    onClick={(event) => {
                        show(event.target, props.quote.getAddress(), textFieldRef.current?.input?.current);
                    }}
                />
            </div>

            <label>Please send exactly <strong>{props.quote.getInput().amount}</strong> {Tokens.BITCOIN.BTC.ticker} to the address</label>
            <ValidatedInput
                type={"text"}
                value={props.quote.getAddress()}
                textEnd={(
                    <a href="#" onClick={(event) => {
                        event.preventDefault();
                        show(event.target as HTMLElement, props.quote.getAddress(), textFieldRef.current?.input?.current);
                    }}>
                        <Icon icon={clipboard}/>
                    </a>
                )}
                onCopy={() => {
                    //Direct call to open the modal here breaks the copying, this is a workaround
                    if(showCopyWarningRef.current) setTimeout(openModalRef.current, 100);
                }}
                inputRef={textFieldRef}
            />

            <div className="d-flex justify-content-center mt-2">
                <Button
                    variant="light"
                    className="d-flex flex-row align-items-center justify-content-center"
                    onClick={() => {
                        window.location.href = props.quote.getHyperlink();
                    }}
                >
                    <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in BTC wallet app
                </Button>
            </div>
        </>
    ), [props.quote]);

    return (
        <>
            <OnchainAddressCopyModal openRef={openModalRef} amountBtc={props.quote?.getInput()?.amount} setShowCopyWarning={setShowCopyWarning}/>

            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

            <SwapExpiryProgressBar
                expired={isQuoteExpired}
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={(isCreated || isQuoteExpired) && !commitLoading && !props.notEnoughForGas && smartChainWallet!==undefined && hasEnoughBalance}
            />

            <ErrorAlert className="mb-3" title="Swap initialization error" error={commitError}/>

            {isCreated && hasEnoughBalance ? (
                smartChainWallet===undefined ? (
                    <ButtonWithWallet chainId={props.quote.chainIdentifier} requiredWalletAddress={props.quote._getInitiator()} size="lg"/>
                ) : (
                    <>
                        <SwapForGasAlert notEnoughForGas={props.notEnoughForGas} quote={props.quote}/>

                        <ButtonWithWallet
                            requiredWalletAddress={props.quote._getInitiator()}
                            chainId={props.quote.chainIdentifier}
                            onClick={onCommit}
                            disabled={commitLoading || !!props.notEnoughForGas || !hasEnoughBalance}
                            size="lg"
                            className="d-flex flex-row"
                        >
                            {commitLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Initiate swap
                        </ButtonWithWallet>
                    </>
                )
            ) : ""}

            {isCommited ? (
                <>
                    <div className="mb-3 tab-accent">
                        {bitcoinChainData.wallet != null ? (
                            <>
                                <ErrorAlert className="mb-2" title="Sending BTC failed" error={payError}/>

                                <div className="d-flex flex-column align-items-center justify-content-center">
                                    {payTxId != null ? (
                                        <div className="d-flex flex-column align-items-center p-2">
                                            <Spinner/>
                                            <label>Sending Bitcoin transaction...</label>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                variant="light"
                                                className="d-flex flex-row align-items-center"
                                                disabled={payLoading}
                                                onClick={payBitcoin}
                                            >
                                                {payLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                                Pay with <img width={20} height={20} src={bitcoinChainData.wallet?.icon} className="ms-2 me-1"/> {bitcoinChainData.wallet?.name}
                                            </Button>

                                            <small className="mt-2">
                                                <a href="#" onClick={(e) => {
                                                    e.preventDefault();
                                                    bitcoinChainData.disconnect();
                                                }}>
                                                    Or use a QR code/wallet address
                                                </a>
                                            </small>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <CopyOverlay placement={"top"}>
                                {addressContent}
                            </CopyOverlay>
                        )}
                    </div>

                    <SwapExpiryProgressBar
                        timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                        expiryText="Swap address expired, please do not send any funds!" quoteAlias="Swap address"
                    />

                    {waitPaymentError==null ? (
                        <Button onClick={props.abortSwap} variant="danger">
                            Abort swap
                        </Button>
                    ) : (
                        <>
                            <ErrorAlert className="mb-3" title="Wait payment error" error={waitPaymentError}/>
                            <Button onClick={onWaitForPayment} variant="secondary">
                                Retry
                            </Button>
                        </>
                    )}
                </>
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

            {isExpired ? (
                <SwapExpiryProgressBar
                    expired={true}
                    timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                    expiryText="Swap address expired, please do not send any funds!" quoteAlias="Swap address"
                />
            ) : ""}

            {isFailed ? (
                <Alert variant="danger" className="mb-3">
                    <strong>Swap failed</strong>
                    <label>Swap address expired without receiving the required funds!</label>
                </Alert>
            ) : ""}

            {(
                isQuoteExpired ||
                isExpired ||
                isFailed ||
                isSuccess
            ) ? (
                <Button onClick={props.refreshQuote} variant="secondary">
                    New quote
                </Button>
            ) : ""}

            <ScrollAnchor trigger={isCommited}/>

        </>
    )
}