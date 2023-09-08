import {useEffect, useRef, useState} from "react";
import {Alert, Button, ProgressBar, Spinner} from "react-bootstrap";
import {QRCodeSVG} from "qrcode.react";
import {btcCurrency, toHumanReadableString} from "../../../utils/Currencies";
import ValidatedInput from "../../ValidatedInput";
import {FromBTCSwap, FromBTCSwapState} from "sollightning-sdk";

export function FromBTCQuoteSummary(props: {
    quote: FromBTCSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void
}) {

    const [state, setState] = useState<FromBTCSwapState>(null);

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const expiryTime = useRef<number>();

    const [loading, setLoading] = useState<boolean>();
    const [success, setSuccess] = useState<boolean>();
    const [error, setError] = useState<string>();

    const [txData, setTxData] = useState<{
        txId: string,
        confirmations: number,
        confTarget: number
    }>(null);

    useEffect(() => {

        if(props.quote==null) return () => {};

        setSuccess(null);
        setError(null);

        let interval;
        interval = setInterval(() => {
            let dt = expiryTime.current-Date.now();
            if(dt<=0) {
                clearInterval(interval);
                dt = 0;
            }
            setQuoteTimeRemaining(Math.floor(dt/1000));
        }, 500);

        expiryTime.current = props.quote.getExpiry();

        const dt = Math.floor((expiryTime.current-Date.now())/1000);
        setInitialQuoteTimeout(dt);
        setQuoteTimeRemaining(dt);

        let listener;

        const abortController = new AbortController();

        let paymentSubscribed = false;

        // setState(FromBTCSwapState.CLAIM_COMMITED);
        // setTxData({
        //     txId: "c2a779af671bccd5d0b17e4327a2aefbf465eb39097f0b2a7c702689dbfa09b2",
        //     confirmations: 0,
        //     confTarget: 2
        // });

        const stateChange = (state: FromBTCSwapState) => {
            setState(state);
            if(state===FromBTCSwapState.CLAIM_COMMITED) {
                if(!paymentSubscribed) {
                    props.quote.waitForPayment(abortController.signal, null, (txId: string, confirmations: number, confirmationTarget: number) => {
                        setTxData({
                            txId,
                            confirmations,
                            confTarget: confirmationTarget
                        });
                    });
                    let paymentInterval;
                    paymentInterval = setInterval(() => {
                        if(abortController.signal.aborted) {
                            clearInterval(paymentInterval);
                            return;
                        }
                        let dt = expiryTime.current-Date.now();
                        if(dt<=0) {
                            clearInterval(interval);
                            dt = 0;
                            if(props.setAmountLock) props.setAmountLock(false);
                        }
                        setQuoteTimeRemaining(Math.floor(dt/1000));
                    }, 500);

                    expiryTime.current = props.quote.getTimeoutTime();
                    const dt = Math.floor((expiryTime.current-Date.now())/1000);
                    setInitialQuoteTimeout(dt);
                    setQuoteTimeRemaining(dt);
                }
                paymentSubscribed = true;
            }
            if(state===FromBTCSwapState.CLAIM_CLAIMED) {
                if(props.setAmountLock) props.setAmountLock(false);
            }
        };

        stateChange(props.quote.getState());

        props.quote.events.on("swapState", listener = (quote: FromBTCSwap<any>) => {
            stateChange(quote.getState());
        });

        return () => {
            clearInterval(interval);
            props.quote.events.removeListener("swapState", listener);
            abortController.abort();
        };

    }, [props.quote]);

    const onCommit = async () => {
        setLoading(true);
        try {
            if(props.setAmountLock) props.setAmountLock(true);
            await props.quote.commit();
        } catch (e) {
            if(props.setAmountLock) props.setAmountLock(false);
            setError(e.toString());
            expiryTime.current = 0;
            setQuoteTimeRemaining(0);
        }
        setLoading(false);
    };

    const onClaim = async () => {
        setLoading(true);
        try {
            await props.quote.claim();
            setLoading(false);
            setSuccess(true);
        } catch (e) {
            setSuccess(false);
            setError(e.toString());
        }
    };

    return (
        <>
            {error!=null ? (
                <Alert variant="danger" className="mb-3">
                    <strong>Swap failed</strong>
                    <label>{error}</label>
                </Alert>
            ) : ""}

            {state===FromBTCSwapState.PR_CREATED ? (
                <>
                    <div className={success===null && !loading ? "d-flex flex-column mb-3" : "d-none"}>
                        {quoteTimeRemaining===0 ? (
                            <label>Quote expired!</label>
                        ) : (
                            <label>Quote expires in {quoteTimeRemaining} seconds</label>
                        )}
                        <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                    </div>
                    {quoteTimeRemaining===0 && !loading ? (
                        <Button onClick={props.refreshQuote} variant="secondary">
                            New quote
                        </Button>
                    ) : (
                        <Button onClick={onCommit} disabled={loading} size="lg">
                            {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Initiate swap
                        </Button>
                    )}
                </>
            ) : ""}

            {state===FromBTCSwapState.CLAIM_COMMITED ? (txData==null ? (
                <>
                    {quoteTimeRemaining===0 ? "" : (
                        <>
                            <div>
                                <QRCodeSVG
                                    value={props.quote.getQrData()}
                                    size={300}
                                    includeMargin={true}
                                />
                            </div>
                            <label>Please send exactly {toHumanReadableString(props.quote.getInAmount(), btcCurrency)} {btcCurrency.ticker} to the address</label>
                            <ValidatedInput
                                type={"text"}
                                value={props.quote.getAddress()}
                                className="mb-3"
                            />
                        </>
                    )}
                    <div className="d-flex flex-column mb-3">
                        {quoteTimeRemaining===0 ? (
                            <label>Swap address expired, please do not send any funds!</label>
                        ) : (
                            <label>Swap address expires in {quoteTimeRemaining} seconds</label>
                        )}
                        <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                    </div>
                    {quoteTimeRemaining===0 ? (
                        <Button onClick={props.refreshQuote} variant="secondary">
                            New quote
                        </Button>
                    ) : (
                        <Button onClick={props.abortSwap} variant="danger">
                            Abort swap
                        </Button>
                    )}
                </>
            ) : (
                <div className="d-flex flex-column align-items-center">
                    <label>Transaction successfully received, waiting for confirmations...</label>

                    <Spinner/>
                    <label>{txData.confirmations} / {txData.confTarget}</label>
                    <label>Confirmations</label>
                </div>
            )) : ""}

            {state===FromBTCSwapState.BTC_TX_CONFIRMED ? (
                <>
                    <label>Transaction received & confirmed</label>

                    <Button onClick={onClaim} disabled={loading} size="lg">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Finish swap (claim funds)
                    </Button>
                </>
            ) : ""}

            {state===FromBTCSwapState.CLAIM_CLAIMED ? (
                <Alert variant="success">
                    <strong>Swap successful</strong>
                    <label>Swap was concluded successfully</label>
                </Alert>
            ) : ""}

        </>
    )
}