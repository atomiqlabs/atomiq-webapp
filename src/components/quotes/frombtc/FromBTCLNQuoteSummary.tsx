import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {Alert, Button, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCLNSwapState} from "@atomiqlabs/sdk";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";
import {useSwapState} from "../../../utils/useSwapState";
import {ScrollAnchor} from "../../ScrollAnchor";
import {LightningHyperlinkModal} from "./LightningHyperlinkModal";
import {useLightningWallet} from "../../../bitcoin/lightning/useLightningWallet";
import {SwapExpiryProgressBar} from "../../SwapExpiryProgressBar";
import {SwapForGasAlert} from "../../SwapForGasAlert";

import {StepByStep} from "../../StepByStep";
import * as BN from "bn.js";
import {useLocalStorage} from "../../../utils/useLocalStorage";
import {LightningQR} from "./LightningQR";
import {ErrorAlert} from "../../ErrorAlert";
import {useFromBtcLnQuote} from "../../../utils/useFromBtcLnQuote";

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
    notEnoughForGas: BN
}) {
    const {getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage("crossLightning-autoClaim", false);
    const [initClicked, setInitClicked] = useState<boolean>(false);

    const openModalRef = useRef<() => void>(null);
    const onHyperlink = useCallback(() => {
        openModalRef.current();
    }, []);

    const {walletConnected} = useLightningWallet();

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
            if(autoClaim || walletConnected) onCommit(true).then(() => {
                if(!canClaimInOneShot) onClaim(true)
            });
        }
    }, [state]);

    return (
        <>
            <LightningHyperlinkModal openRef={openModalRef} hyperlink={props.quote.getQrData()}/>

            {isInitiated ? <StepByStep steps={executionSteps}/> : ""}

            {isCreated && !paymentWaiting ? (
                signer===undefined ? (
                    <ButtonWithSigner chainId={props.quote.chainIdentifier} signer={signer} size="lg"/>
                ) : (
                    <>
                        <ErrorAlert className="mb-3" title="Swap initialization error" error={paymentError}/>

                        <SwapForGasAlert notEnoughForGas={props.notEnoughForGas} quote={props.quote}/>

                        <SwapExpiryProgressBar
                            timeRemaining={quoteTimeRemaining}
                            totalTime={totalQuoteTime}
                        />

                        <ButtonWithSigner signer={signer} chainId={props.quote?.chainIdentifier} onClick={() => {
                            setInitClicked(true);
                            waitForPayment();
                        }} disabled={!!props.notEnoughForGas} size="lg">
                            Initiate swap
                        </ButtonWithSigner>
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

                    <ButtonWithSigner
                        signer={signer}
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
                    </ButtonWithSigner>
                    {!canClaimInOneShot ? (
                        <ButtonWithSigner
                            signer={signer}
                            chainId={props.quote?.chainIdentifier}
                            onClick={() => onClaim()}
                            disabled={claiming || !isClaimClaimable}
                            size={isClaimClaimable ? "lg" : "sm"}
                            className="mt-2"
                        >
                            {claiming ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            {claiming ? "2. Claiming funds..." : "2. Finish swap (claim funds)"}
                        </ButtonWithSigner>
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