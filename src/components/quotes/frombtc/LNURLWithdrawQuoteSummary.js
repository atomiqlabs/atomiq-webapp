import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, ProgressBar, Spinner } from "react-bootstrap";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
export function LNURLWithdrawQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const [state, setState] = useState(null);
    const expiryTime = useRef();
    const [loading, setLoading] = useState();
    const [success, setSuccess] = useState();
    const [error, setError] = useState();
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
        expiryTime.current = Date.now() + (30 * 1000);
        const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
        setInitialQuoteTimeout(dt);
        setQuoteTimeRemaining(dt);
        if (props.quote.getState() === FromBTCLNSwapState.PR_CREATED) {
            if (props.autoContinue)
                onContinue(true);
        }
        let listener;
        setState(props.quote.getState());
        props.quote.events.on("swapState", listener = (quote) => {
            setState(quote.getState());
        });
        return () => {
            clearInterval(interval);
            props.quote.events.removeListener("swapState", listener);
        };
    }, [props.quote]);
    const onContinue = async (skipChecks) => {
        if (props.quote.getState() === FromBTCLNSwapState.CLAIM_COMMITED) {
            setLoading(true);
            try {
                await props.quote.commitAndClaim(signer, null, skipChecks);
                setSuccess(true);
            }
            catch (e) {
                setError(e.toString());
            }
            if (props.setAmountLock)
                props.setAmountLock(false);
            setLoading(false);
            return;
        }
        if (!props.quote.prPosted) {
            setLoading(true);
            try {
                if (props.setAmountLock)
                    props.setAmountLock(true);
                await props.quote.waitForPayment(null, 1);
            }
            catch (e) {
                console.error(e);
                setSuccess(false);
                setError(e.toString());
                setLoading(false);
                if (props.setAmountLock)
                    props.setAmountLock(false);
                return;
            }
            try {
                await props.quote.commitAndClaim(signer, null, skipChecks);
                setSuccess(true);
            }
            catch (e) {
                setError(e.toString());
                if (props.quote.getState() !== FromBTCLNSwapState.CLAIM_COMMITED)
                    setSuccess(false);
            }
            if (props.setAmountLock)
                props.setAmountLock(false);
            setLoading(false);
        }
    };
    return (_jsxs(_Fragment, { children: [error != null ? (_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: error })] })) : "", _jsxs("div", { className: state !== FromBTCLNSwapState.CLAIM_COMMITED && success === null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] }), success === null ? (state !== FromBTCLNSwapState.CLAIM_COMMITED && quoteTimeRemaining === 0 && !loading ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: () => onContinue(), disabled: loading, size: "lg", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Claim"] }))) : (success ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was concluded successfully" })] })) : (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })))] }));
}
