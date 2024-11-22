import * as React from "react";
import {useContext, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Badge, Button, Spinner} from "react-bootstrap";
import {QRCodeSVG} from "qrcode.react";
import ValidatedInput, {ValidatedInputRef} from "../../ValidatedInput";
import {FromBTCSwap, FromBTCSwapState, Tokens} from "@atomiqlabs/sdk";
import Icon from "react-icons-kit";
import {clipboard} from "react-icons-kit/fa/clipboard";
import * as BN from "bn.js";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import {getDeltaText} from "../../../utils/Utils";
import {FEConstants} from "../../../FEConstants";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";
import {ScrollAnchor} from "../../ScrollAnchor";
import {CopyOverlay} from "../../CopyOverlay";
import {useOnchainWallet} from "../../../bitcoin/onchain/useOnchainWallet";
import {useSwapState} from "../../../utils/useSwapState";
import {useAsync} from "../../../utils/useAsync";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";
import {SwapForGasAlert} from "../../SwapForGasAlert";

import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_pending_outline} from 'react-icons-kit/md/ic_pending_outline';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {SingleStep, StepByStep} from "../../StepByStep";
import {useStateRef} from "../../../utils/useStateRef";

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
    notEnoughForGas: BN,
    feeRate?: number,
    balance?: BN
}) {
    const {getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const {state, totalQuoteTime, quoteTimeRemaining} = useSwapState(props.quote);

    const setAmountLockRef = useStateRef(props.setAmountLock);

    const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(() => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        return props.quote.commit(signer).catch(e => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw e;
        });
    }, [props.quote, signer]);

    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return props.quote.claim(signer);
    }, [props.quote, signer]);

    const textFieldRef = useRef<ValidatedInputRef>();

    const {walletConnected, disconnect, pay, payLoading, paySuccess, payTxId, payError} = useOnchainWallet();
    const sendBitcoinTransaction = () => pay(props.quote.getBitcoinAddress(), props.quote.getInput().rawAmount, props.feeRate!=null && props.feeRate!==0 ? props.feeRate : null)

    const [txData, setTxData] = useState<{
        txId: string,
        confirmations: number,
        confTarget: number,
        txEtaMs: number
    }>(null);

    useEffect(() => {
        const abortController = new AbortController();

        if(state===FromBTCSwapState.CLAIM_COMMITED || state===FromBTCSwapState.EXPIRED) {
            props.quote.getBitcoinPayment().then(resp => {
                if(resp==null && walletConnected!=null) {
                    sendBitcoinTransaction();
                }
            });
            props.quote.waitForBitcoinTransaction(abortController.signal, null, (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
                console.log("BTC tx eta: ", txEtaMs);
                setTxData({
                    txId,
                    confirmations,
                    confTarget: confirmationTarget,
                    txEtaMs
                });
            }).catch(e => console.error(e));
        }

        if(state===FromBTCSwapState.FAILED || state===FromBTCSwapState.CLAIM_CLAIMED) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        }

        return () => abortController.abort();
    }, [state]);

    const hasEnoughBalance = useMemo(
        () => props.balance==null || props.quote==null ? true : props.balance.gte(props.quote.getInput().rawAmount),
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

    if(isCreated) executionSteps[0] = {icon: ic_hourglass_empty_outline, text: "Opening swap address", type: "loading"};
    if(isQuoteExpired) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};

    if(isCommited) executionSteps[1] = {icon: ic_pending_outline, text: "Awaiting bitcoin payment", type: "loading"};
    if(isReceived) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Waiting bitcoin confirmations", type: "loading"};
    if(isClaimable || isClaiming || isSuccess) executionSteps[1] = {icon: ic_check_circle_outline, text: "Bitcoin confirmed", type: "success"};
    if(isExpired || isFailed) executionSteps[1] = {icon: ic_watch_later_outline, text: "Swap expired", type: "failed"};

    if(isClaimable) executionSteps[2] = {icon: ic_swap_horizontal_circle_outline, text: "Claim transaction", type: "loading"};
    if(isClaiming) executionSteps[2] = {icon: ic_hourglass_empty_outline, text: "Sending claim transaction", type: "loading"};
    if(isSuccess) executionSteps[2] = {icon: ic_verified_outline, text: "Claim success", type: "success"};

    return (
        <>
            {(!isCreated || commitLoading) && !isQuoteExpired ? <StepByStep steps={executionSteps}/> : ""}

            <SwapExpiryProgressBar
                expired={isQuoteExpired}
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={(isCreated || isQuoteExpired) && !commitLoading && !props.notEnoughForGas && signer!==undefined && hasEnoughBalance}
            />

            {isCreated && hasEnoughBalance ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <SwapForGasAlert notEnoughForGas={props.notEnoughForGas} quote={props.quote}/>

                        <Alert className="text-center mb-3" show={commitError!=null} variant="danger" closeVariant="white">
                            <strong>Swap initialization error</strong>
                            <label>{commitError?.message}</label>
                        </Alert>

                        <ButtonWithSigner
                            signer={signer}
                            chainId={props.quote.chainIdentifier}
                            onClick={onCommit}
                            disabled={commitLoading || !!props.notEnoughForGas || !hasEnoughBalance}
                            size="lg"
                            className="d-flex flex-row"
                        >
                            {commitLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Initiate swap
                        </ButtonWithSigner>
                    </>
                )
            ) : ""}

            {isCommited ? (
                <>
                    <div className="mb-3 tab-accent">
                        {walletConnected != null ? (
                            <>
                                <Alert variant="danger" className="mb-2" show={!!payError}>
                                    <strong>Sending BTC failed</strong>
                                    <label>{payError}</label>
                                </Alert>

                                <div className="d-flex flex-column align-items-center justify-content-center">
                                    {payTxId != null ? (
                                        <div className="d-flex flex-column align-items-center tab-accent">
                                            <Spinner/>
                                            <label>Sending Bitcoin transaction...</label>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                variant="light"
                                                className="d-flex flex-row align-items-center"
                                                disabled={payLoading}
                                                onClick={sendBitcoinTransaction}
                                            >
                                                {payLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                                Pay with <img width={20} height={20} src={walletConnected.getIcon()} className="ms-2 me-1"/> {walletConnected.getName()}
                                            </Button>

                                            <small className="mt-2">
                                                <a href="javascript:void(0);" onClick={disconnect}>
                                                    Or use a QR code/wallet address
                                                </a>
                                            </small>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <CopyOverlay placement={"top"}>
                                {(show) => (
                                    <>
                                        <Alert variant="warning" className="mb-3">
                                            <label>Please make sure that you send an <b><u>EXACT</u></b> amount in BTC, different amount wouldn't be accepted and you might loose funds!</label>
                                        </Alert>

                                        <div className="mb-2">
                                            <QRCodeSVG
                                                value={props.quote.getQrData()}
                                                size={300}
                                                includeMargin={true}
                                                className="cursor-pointer"
                                                onClick={(event) => {
                                                    show(event.target, props.quote.getBitcoinAddress(), textFieldRef.current?.input?.current);
                                                }}
                                            />
                                        </div>

                                        <label>Please send exactly <strong>{props.quote.getInput().amount}</strong> {Tokens.BITCOIN.BTC.ticker} to the address</label>
                                        <ValidatedInput
                                            type={"text"}
                                            value={props.quote.getBitcoinAddress()}
                                            textEnd={(
                                                <a href="javascript:void(0);" onClick={(event) => {
                                                    show(event.target as HTMLElement, props.quote.getBitcoinAddress(), textFieldRef.current?.input?.current);
                                                }}>
                                                    <Icon icon={clipboard}/>
                                                </a>
                                            )}
                                            inputRef={textFieldRef}
                                        />

                                        <div className="d-flex justify-content-center mt-2">
                                            <Button
                                                variant="light"
                                                className="d-flex flex-row align-items-center justify-content-center"
                                                onClick={() => {
                                                    window.location.href = props.quote.getQrData();
                                                }}
                                            >
                                                <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in BTC wallet app
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </CopyOverlay>
                        )}
                    </div>
                    <SwapExpiryProgressBar
                        timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                        expiryText="Swap address expired, please do not send any funds!" quoteAlias="Swap address"
                    />
                    <Button onClick={props.abortSwap} variant="danger">
                        Abort swap
                    </Button>
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
                        className="text-black" bg="light" pill
                    >ETA: {txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)}</Badge>
                </div>
            ) : ""}

            {isClaimable || isClaiming ? (
                <>
                    <div className="d-flex flex-column align-items-center tab-accent mb-3">
                        <label>Transaction received & confirmed</label>
                    </div>

                    <Alert variant="danger" className="mb-3" show={!!claimError}>
                        <strong>Claim error</strong>
                        <label>{claimError?.message}</label>
                    </Alert>

                    <ButtonWithSigner signer={signer} chainId={props.quote.chainIdentifier} onClick={onClaim}
                                      disabled={claimLoading} size="lg">
                        {claimLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Finish swap (claim funds)
                    </ButtonWithSigner>
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