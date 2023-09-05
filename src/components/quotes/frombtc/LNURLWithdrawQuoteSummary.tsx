import {useEffect, useRef, useState} from "react";
import {Alert, Button, ProgressBar, Spinner} from "react-bootstrap";
import {FromBTCLNSwap} from "sollightning-sdk";

export function LNURLWithdrawQuoteSummary(props: {
    quote: FromBTCLNSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap"
}) {

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
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

        return () => {
            clearInterval(interval);
        };

    }, [props.quote]);

    const onContinue = async () => {
        if (!props.quote.prPosted) {
            setLoading(true);
            try {
                if(props.setAmountLock) props.setAmountLock(true);
                await props.quote.waitForPayment();
                await props.quote.commitAndClaim();
                setSuccess(true);
            } catch (e) {
                setSuccess(false);
                setError(e.toString());
            }
            if(props.setAmountLock) props.setAmountLock(false);
            setLoading(false);
        }
    };

    return (
        <>
            <div className={success===null && !loading ? "d-flex flex-column mb-3" : "d-none"}>
                {quoteTimeRemaining===0 ? (
                    <label>Quote expired!</label>
                ) : (
                    <label>Quote expires in {quoteTimeRemaining} seconds</label>
                )}
                <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
            </div>

            {success===null ? (
                quoteTimeRemaining===0 && !loading ? (
                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                ) : (
                    <Button onClick={onContinue} disabled={loading} size="lg">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Claim
                    </Button>
                )
            ) : (
                success ? (
                    <Alert variant="success">
                        <p><strong>Swap successful</strong></p>
                        Swap was concluded successfully
                    </Alert>
                ) : (
                    <>
                        <Alert variant="danger" className="mb-3">
                            <p><strong>Swap failed</strong></p>
                            {error}
                        </Alert>
                        <Button onClick={props.refreshQuote} variant="secondary">
                            New quote
                        </Button>
                    </>
                )
            )}

        </>
    )
}
