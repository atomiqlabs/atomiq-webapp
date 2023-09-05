import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, ProgressBar, Spinner } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import { btcCurrency, toHumanReadableString } from "../../../utils/Currencies";
import ValidatedInput from "../../ValidatedInput";
import { FromBTCSwapState } from "sollightning-sdk";
export function FromBTCQuoteSummary(props) {
    const [state, setState] = useState(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const expiryTime = useRef();
    const [loading, setLoading] = useState();
    const [success, setSuccess] = useState();
    const [error, setError] = useState();
    const [txData, setTxData] = useState(null);
    useEffect(() => {
        if (props.quote == null)
            return () => { };
        setSuccess(null);
        setError(null);
        let interval;
        interval = setInterval(() => {
            let dt = expiryTime.current - Date.now();
            if (dt <= 0) {
                clearInterval(interval);
                dt = 0;
            }
            setQuoteTimeRemaining(Math.floor(dt / 1000));
        }, 500);
        expiryTime.current = props.quote.getExpiry();
        const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
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
        const stateChange = (state) => {
            setState(state);
            if (state === FromBTCSwapState.CLAIM_COMMITED) {
                if (!paymentSubscribed) {
                    props.quote.waitForPayment(abortController.signal, null, (txId, confirmations, confirmationTarget) => {
                        setTxData({
                            txId,
                            confirmations,
                            confTarget: confirmationTarget
                        });
                    });
                    let paymentInterval;
                    paymentInterval = setInterval(() => {
                        if (abortController.signal.aborted) {
                            clearInterval(paymentInterval);
                            return;
                        }
                        let dt = expiryTime.current - Date.now();
                        if (dt <= 0) {
                            clearInterval(interval);
                            dt = 0;
                            if (props.setAmountLock)
                                props.setAmountLock(false);
                        }
                        setQuoteTimeRemaining(Math.floor(dt / 1000));
                    }, 500);
                    expiryTime.current = props.quote.getTimeoutTime();
                    const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
                    setInitialQuoteTimeout(dt);
                    setQuoteTimeRemaining(dt);
                }
                paymentSubscribed = true;
            }
            if (state === FromBTCSwapState.CLAIM_CLAIMED) {
                if (props.setAmountLock)
                    props.setAmountLock(false);
            }
        };
        stateChange(props.quote.getState());
        props.quote.events.on("swapState", listener = (quote) => {
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
            if (props.setAmountLock)
                props.setAmountLock(true);
            await props.quote.commit();
        }
        catch (e) {
            if (props.setAmountLock)
                props.setAmountLock(false);
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
        }
        catch (e) {
            setSuccess(false);
            setError(e.toString());
        }
    };
    return (_jsxs(_Fragment, { children: [error != null ? (_jsxs(Alert, Object.assign({ variant: "danger", className: "mb-3" }, { children: [_jsx("p", { children: _jsx("strong", { children: "Swap failed" }) }), error] }))) : "", state === FromBTCSwapState.PR_CREATED ? (_jsxs(_Fragment, { children: [_jsxs("div", Object.assign({ className: success === null && !loading ? "d-flex flex-column mb-3" : "d-none" }, { children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] })), quoteTimeRemaining === 0 && !loading ? (_jsx(Button, Object.assign({ onClick: props.refreshQuote, variant: "secondary" }, { children: "New quote" }))) : (_jsxs(Button, Object.assign({ onClick: onCommit, disabled: loading, size: "lg" }, { children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Initiate swap"] })))] })) : "", state === FromBTCSwapState.CLAIM_COMMITED ? (txData == null ? (_jsxs(_Fragment, { children: [quoteTimeRemaining === 0 ? "" : (_jsxs(_Fragment, { children: [_jsx("div", { children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true }) }), _jsxs("label", { children: ["Please send exactly ", toHumanReadableString(props.quote.getInAmount(), btcCurrency), " ", btcCurrency.ticker, " to the address"] }), _jsx(ValidatedInput, { type: "text", value: props.quote.getAddress(), className: "mb-3" })] })), _jsxs("div", Object.assign({ className: "d-flex flex-column mb-3" }, { children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Swap address expired, please do not send any funds!" })) : (_jsxs("label", { children: ["Swap address expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] })), quoteTimeRemaining === 0 ? (_jsx(Button, Object.assign({ onClick: props.refreshQuote, variant: "secondary" }, { children: "New quote" }))) : (_jsx(Button, Object.assign({ onClick: props.abortSwap, variant: "danger" }, { children: "Abort swap" })))] })) : (_jsxs("div", Object.assign({ className: "d-flex flex-column align-items-center" }, { children: [_jsx("label", { children: "Transaction successfully received, waiting for confirmations..." }), _jsx(Spinner, {}), _jsxs("label", { children: [txData.confirmations, " / ", txData.confTarget] }), _jsx("label", { children: "Confirmations" })] })))) : "", state === FromBTCSwapState.BTC_TX_CONFIRMED ? (_jsxs(_Fragment, { children: [_jsx("label", { children: "Transaction received & confirmed" }), _jsxs(Button, Object.assign({ onClick: onClaim, disabled: loading, size: "lg" }, { children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] }))] })) : "", state === FromBTCSwapState.CLAIM_CLAIMED ? (_jsxs(Alert, Object.assign({ variant: "success" }, { children: [_jsx("p", { children: _jsx("strong", { children: "Swap successful" }) }), "Swap was concluded successfully"] }))) : ""] }));
}
