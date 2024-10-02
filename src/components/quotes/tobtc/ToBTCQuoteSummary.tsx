import {useContext, useEffect, useRef, useState} from "react";
import {Alert, Button, Card, ProgressBar, Spinner} from "react-bootstrap";
import {IToBTCSwap, Swapper, SwapType, ToBTCLNSwap, ToBTCSwap, ToBTCSwapState} from "sollightning-sdk";
import {getCurrencySpec, toHumanReadableString} from "../../../utils/Currencies";
import * as React from "react";
import * as bolt11 from "bolt11";
import * as BN from "bn.js";
import {FEConstants} from "../../../FEConstants";
import {SwapsContext} from "../../../context/SwapsContext";

const SNOWFLAKE_LIST: Set<string> = new Set([
    "038f8f113c580048d847d6949371726653e02b928196bad310e3eda39ff61723f6",
    "03a6ce61fcaacd38d31d4e3ce2d506602818e3856b4b44faff1dde9642ba705976"
]);

export function ToBTCQuoteSummary(props: {
    quote: IToBTCSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    balance?: BN,
    autoContinue?: boolean,
    notEnoughForGas: boolean
}) {
    const {swapper} = useContext(SwapsContext);

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const expiryTime = useRef<number>();

    const [confidenceWarning, setConfidenceWarning] = useState<boolean>(false);
    const [nonCustodialWarning, setNonCustodialWarning] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>();
    const [success, setSuccess] = useState<boolean>();
    const [refund, setRefund] = useState<boolean>();
    const [error, setError] = useState<string>();

    // console.log("[ToBTCQuoteSummary] Quote Error: ", error, confidenceWarning, nonCustodialWarning, props.notEnoughForGas);

    const [refunding, setRefunding] = useState<boolean>();
    const [refunded, setRefunded] = useState<boolean>();

    const onContinue = async (skipChecks?: boolean) => {
        setLoading(true);
        try {
            if(props.setAmountLock) props.setAmountLock(true);
            await props.quote.commit(null, null, skipChecks);
            const success = await props.quote.waitForPayment(null, 2);
            if(success) {
                setSuccess(true);
                setNonCustodialWarning(false);
                setConfidenceWarning(false);
                if(props.setAmountLock) props.setAmountLock(false);
            } else {
                setSuccess(false);
                setRefund(true);
                setError("Swap failed, you can refund your prior deposit");
            }
        } catch (e) {
            console.error(e);
            setSuccess(false);
            setError(e.toString());
            if(props.setAmountLock) props.setAmountLock(false);
        }
        setLoading(false);
    };

    const onRefund = async () => {
        setRefunding(true);
        try {
            await props.quote.refund();
            setRefunded(true);
            setError("Deposit refunded successfully");
            if(props.setAmountLock) props.setAmountLock(false);
        } catch (e) {
            console.error(e);
        }
        setRefunding(false);
    };

    useEffect(() => {

        if(props.quote==null) return () => {};

        let cancelled = false;

        if(confidenceWarning) setConfidenceWarning(false);
        if(props.quote.getState()===ToBTCSwapState.CREATED) {
            if(props.quote instanceof ToBTCLNSwap && props.quote.getConfidence()===0) {
                let isSnowflake: boolean = false;
                let isNonCustodial: boolean = false;
                if(props.quote.getLightningInvoice()!=null) {
                    const parsedRequest = bolt11.decode(props.quote.getLightningInvoice());

                    if(parsedRequest.tagsObject.routing_info!=null) {
                        for (let route of parsedRequest.tagsObject.routing_info) {
                            isNonCustodial = true;
                            if (SNOWFLAKE_LIST.has(route.pubkey)) {
                                isSnowflake = true;
                            }
                        }
                    }
                }

                if(confidenceWarning===isSnowflake) setConfidenceWarning(!isSnowflake);
                setNonCustodialWarning(!confidenceWarning && isNonCustodial);
            }

            //Check that we have enough funds!
            const neededToPay = props.quote.getInAmount();

            let balancePromise: Promise<BN>;
            if(props.balance!=null) {
                balancePromise = Promise.resolve(props.balance);
            } else {
                balancePromise = swapper.getBalance(props.quote.data.getToken());
            }

            balancePromise.then(balance => {
                if(cancelled) return;
                const hasEnoughBalance = balance.gte(neededToPay);

                if(!hasEnoughBalance) {
                    const currency = getCurrencySpec(props.quote.getInToken());
                    setSuccess(false);
                    setError("You don't have enough funds to initiate the swap, balance: "+toHumanReadableString(balance, currency)+" "+currency.ticker);
                    setLoading(false);
                    return;
                }

                if(props.autoContinue) onContinue(true);
            });
        }

        setSuccess(null);
        setRefund(false);
        setError(null);
        setRefunding(false);
        setRefunded(false);

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

        return () => {
            clearInterval(interval);
            cancelled = true;
        };

    }, [props.quote]);

    return (
        <>
            <Alert className="text-center mb-3" show={confidenceWarning} variant="warning" onClose={() => setConfidenceWarning(false)} dismissible closeVariant="white">
                <strong>Payment might likely fail!</strong>
                <label>We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!</label>
            </Alert>

            {props.type==="swap" ? <Alert className="text-center mb-3" show={nonCustodialWarning} variant="success" onClose={() => setNonCustodialWarning(false)} dismissible closeVariant="white">
                <strong>Non-custodial wallet info</strong>
                <label>Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!</label>
            </Alert> : ""}

            <div className={success===null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none"}>
                {quoteTimeRemaining===0 ? (
                    <label>Quote expired!</label>
                ) : (
                    <label>Quote expires in {quoteTimeRemaining} seconds</label>
                )}
                <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
            </div>

            <Alert className="text-center mb-3" show={props.notEnoughForGas} variant="danger" closeVariant="white">
                <strong>Not enough SOL for fees</strong>
                <label>You need at least 0.005 SOL to pay for fees and deposits!</label>
            </Alert>

            {success===undefined ? "" : success===null ? (
                quoteTimeRemaining===0 && !loading ? (
                    <Button onClick={props.refreshQuote} variant="secondary">
                        New quote
                    </Button>
                ) : (
                    <Button onClick={() => onContinue()} disabled={loading || props.notEnoughForGas} size="lg">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        {props.type==="payment" ? "Pay" : "Swap"}
                    </Button>
                )
            ) : (
                success ? (
                    <Alert variant="success" className="mb-0">
                        <strong>Swap successful</strong>
                        <label>Swap was concluded successfully</label>
                        {props.quote instanceof ToBTCSwap ? (
                            <Button href={FEConstants.btcBlockExplorer+props.quote.getBitcoinTxId()} target="_blank" variant="success" className="mt-3">View transaction</Button>
                        ) : ""}
                    </Alert>
                ) : (
                    <>
                        <Alert variant="danger" className="mb-3">
                            <strong>Swap failed</strong>
                            <label>{error}</label>
                        </Alert>
                        {refund ? (
                            <Button onClick={onRefund} className={refunded ? "d-none" : ""} disabled={refunding} variant="secondary">
                                {refunding ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                Refund deposit
                            </Button>
                        ) : (
                            <Button onClick={props.refreshQuote} variant="secondary">New quote</Button>
                        )}
                    </>
                )
            )}

        </>
    )
}