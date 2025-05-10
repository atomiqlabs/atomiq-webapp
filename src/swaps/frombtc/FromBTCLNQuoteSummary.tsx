import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCLNSwapState} from "@atomiqlabs/sdk";
import {ButtonWithWallet} from "../../wallets/ButtonWithWallet";
import {useSwapState} from "../hooks/useSwapState";
import {ScrollAnchor} from "../../components/ScrollAnchor";
import {LightningHyperlinkModal} from "../components/LightningHyperlinkModal";
import {SwapExpiryProgressBar} from "../components/SwapExpiryProgressBar";
import {SwapForGasAlert} from "../components/SwapForGasAlert";

import {StepByStep} from "../../components/StepByStep";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {LightningQR} from "../components/LightningQR";
import {ErrorAlert} from "../../components/ErrorAlert";
import {useFromBtcLnQuote} from "./useFromBtcLnQuote";
import {ChainDataContext} from "../../wallets/context/ChainDataContext";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCLNQuoteSummary(props: {
    quote: FromBTCLNSwap,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    notEnoughForGas: bigint
}) {
    const lightningWallet = useContext(ChainDataContext).LIGHTNING?.wallet;
    const smartChainWallet = useSmartChainWallet(props.quote, true);

    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage("crossLightning-autoClaim", false);
    const [initClicked, setInitClicked] = useState<boolean>(false);

    const openModalRef = useRef<() => void>(null);
    const onHyperlink = useCallback(() => {
        openModalRef.current();
    }, []);

    const {
        waitForPayment, onCommit, onClaim,
        paymentWaiting, committing, claiming,
        paymentError, commitError, claimError,

        isQuoteExpired,
        isQuoteExpiredClaim,
        isFailed,
        isCreated,
        isClaimCommittable,
        isClaimClaimable,
        isClaimable,
        isSuccess,

        executionSteps
    } = useFromBtcLnQuote(props.quote, props.setAmountLock);

    useEffect(() => {
        if(props.quote!=null && props.quote.isInitiated()) {
            waitForPayment();
        }
    }, [props.quote]);

    useEffect(() => {
        if(state===FromBTCLNSwapState.PR_PAID) {
            if(autoClaim || lightningWallet!=null) onCommit(true).then(() => {
                if(!canClaimInOneShot) onClaim()
            });
        }
    }, [state]);

    return (
        <>
            <LightningHyperlinkModal openRef={openModalRef} hyperlink={props.quote.getHyperlink()}/>

            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

            {isCreated && !paymentWaiting ? (
                smartChainWallet===undefined ? (
                    <ButtonWithWallet chainId={props.quote.chainIdentifier} requiredWalletAddress={props.quote._getInitiator()} size="lg"/>
                ) : (
                    <>
                        <ErrorAlert className="mb-3" title="Swap initialization error" error={paymentError}/>

                        <SwapForGasAlert notEnoughForGas={props.notEnoughForGas} quote={props.quote}/>

                        <SwapExpiryProgressBar
                            timeRemaining={quoteTimeRemaining}
                            totalTime={totalQuoteTime}
                        />

                        <ButtonWithWallet requiredWalletAddress={props.quote._getInitiator()} chainId={props.quote?.chainIdentifier} onClick={() => {
                            setInitClicked(true);
                            waitForPayment();
                        }} disabled={!!props.notEnoughForGas} size="lg">
                            Initiate swap
                        </ButtonWithWallet>
                    </>
                )
            ) : ""}

            {isCreated && paymentWaiting ? (
                <>
                    <LightningQR
                        quote={props.quote}
                        payInstantly={initClicked}
                        setAutoClaim={setAutoClaim}
                        autoClaim={autoClaim}
                        onHyperlink={onHyperlink}
                    />

                    <SwapExpiryProgressBar
                        timeRemaining={quoteTimeRemaining}
                        totalTime={totalQuoteTime}
                        show={true}
                    />

                    <Button onClick={props.abortSwap} variant="danger">
                        Abort swap
                    </Button>
                </>
            ) : ""}

            {isClaimable ? (
                <>
                    <div className="mb-3 tab-accent">
                        <label>Lightning network payment received</label>
                        <label>Claim it below to finish the swap!</label>
                    </div>

                    <ErrorAlert
                        className="mb-3"
                        title={"Swap "+((canClaimInOneShot || claimError!=null) ? "claim" : " claim initialization")+" error"}
                        error={commitError ?? claimError}
                    />

                    <SwapExpiryProgressBar
                        timeRemaining={quoteTimeRemaining} totalTime={totalQuoteTime}
                        show={state === FromBTCLNSwapState.PR_PAID && !claiming && !committing}
                    />

                    <ButtonWithWallet
                        requiredWalletAddress={props.quote._getInitiator()}
                        chainId={props.quote?.chainIdentifier}
                        onClick={() => onCommit()}
                        disabled={committing || (!canClaimInOneShot && !isClaimCommittable)}
                        size={canClaimInOneShot ? "lg" : isClaimCommittable ? "lg" : "sm"}
                    >
                        {committing ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        {canClaimInOneShot ?
                            "Finish swap (claim funds)" :
                            !isClaimCommittable ?
                                "1. Initialized" :
                                committing ?
                                    "1. Initializing..." :
                                    "1. Finish swap (initialize)"
                        }
                    </ButtonWithWallet>
                    {!canClaimInOneShot ? (
                        <ButtonWithWallet
                            requiredWalletAddress={props.quote._getInitiator()}
                            chainId={props.quote?.chainIdentifier}
                            onClick={() => onClaim()}
                            disabled={claiming || !isClaimClaimable}
                            size={isClaimClaimable ? "lg" : "sm"}
                            className="mt-2"
                        >
                            {claiming ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            {claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"}
                        </ButtonWithWallet>
                    ) : ""}
                </>
            ) : ""}

            {isSuccess ? (
                <Alert variant="success" className="mb-3">
                    <strong>Swap successful</strong>
                    <label>Swap was executed successfully</label>
                </Alert>
            ) : ""}

            {(
                isQuoteExpired ||
                isFailed ||
                isSuccess
            ) ? (
                <>
                    <Alert variant="danger" className="mb-3" show={isFailed}>
                        <strong>Swap failed</strong>
                        <label>Swap HTLC expired, your lightning payment will be refunded shortly!</label>
                    </Alert>

                    <SwapExpiryProgressBar
                        show={isQuoteExpired}
                        expired={true}
                        timeRemaining={quoteTimeRemaining}
                        totalTime={totalQuoteTime}
                        expiryText={
                            isInitiated ? "Swap expired! Your lightning payment should refund shortly." : "Swap expired!"
                        } quoteAlias="Swap"
                    />

                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                </>
            ) : ""}

            <ScrollAnchor trigger={isInitiated}></ScrollAnchor>

        </>
    )
}