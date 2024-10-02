import {useEffect, useRef, useState} from "react";
import {Alert, Button, ProgressBar, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCLNSwapState} from "sollightning-sdk";

export function LNURLWithdrawQuoteSummary(props: {
    quote: FromBTCLNSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    autoContinue?: boolean,
    notEnoughForGas: boolean
}) {

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const [state, setState] = useState<FromBTCLNSwapState>(null);
    const expiryTime = useRef<number>();

    const [loading, setLoading] = useState<boolean>();
    const [success, setSuccess] = useState<boolean>();
    const [error, setError] = useState<string>();

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

        expiryTime.current = Date.now()+(30*1000);

        const dt = Math.floor((expiryTime.current-Date.now())/1000);
        setInitialQuoteTimeout(dt);
        setQuoteTimeRemaining(dt);

        if(props.quote.getState()===FromBTCLNSwapState.PR_CREATED) {
            if(props.autoContinue) onContinue(true);
        }

        let listener;
        setState(props.quote.getState());
        props.quote.events.on("swapState", listener = (quote: FromBTCLNSwap<any>) => {
            setState(quote.getState());
        });

        return () => {
            clearInterval(interval);
            props.quote.events.removeListener("swapState", listener);
        };

    }, [props.quote]);

    const onContinue = async (skipChecks?: boolean) => {
        if(props.quote.getState()===FromBTCLNSwapState.CLAIM_COMMITED) {
            setLoading(true);
            try {
                await props.quote.commitAndClaim(null, skipChecks);
                setSuccess(true);
            } catch (e) {
                setError(e.toString());
            }
            if(props.setAmountLock) props.setAmountLock(false);
            setLoading(false);
            return;
        }
        if (!props.quote.prPosted) {
            setLoading(true);
            try {
                if(props.setAmountLock) props.setAmountLock(true);
                await props.quote.waitForPayment(null, 1);
            } catch (e) {
                console.error(e);
                setSuccess(false);
                setError(e.toString());
                setLoading(false);
                if(props.setAmountLock) props.setAmountLock(false);
                return;
            }

            try {
                await props.quote.commitAndClaim(null, skipChecks);
                setSuccess(true);
            } catch (e) {
                setError(e.toString());
                if(props.quote.getState()!==FromBTCLNSwapState.CLAIM_COMMITED) setSuccess(false);
            }
            if(props.setAmountLock) props.setAmountLock(false);
            setLoading(false);
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

            <div className={state!==FromBTCLNSwapState.CLAIM_COMMITED && success===null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none"}>
                {quoteTimeRemaining===0 ? (
                    <label>Quote expired!</label>
                ) : (
                    <label>Quote expires in {quoteTimeRemaining} seconds</label>
                )}
                <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
            </div>

            {success===null ? (
                state!==FromBTCLNSwapState.CLAIM_COMMITED && quoteTimeRemaining===0 && !loading ? (
                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                ) : (
                    <Button onClick={() => onContinue()} disabled={loading} size="lg">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Claim
                    </Button>
                )
            ) : (
                success ? (
                    <Alert variant="success" className="mb-0">
                        <strong>Swap successful</strong>
                        <label>Swap was concluded successfully</label>
                    </Alert>
                ) : (
                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                )
            )}

        </>
    )
}
