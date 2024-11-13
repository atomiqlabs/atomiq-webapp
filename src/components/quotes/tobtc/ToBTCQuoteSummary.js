import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, ProgressBar, Spinner } from "react-bootstrap";
import { ToBTCLNSwap, ToBTCSwap, ToBTCSwapState } from "@atomiqlabs/sdk";
import { toHumanReadableString } from "../../../utils/Currencies";
import * as bolt11 from "bolt11";
import { FEConstants } from "../../../FEConstants";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
const SNOWFLAKE_LIST = new Set([
    "038f8f113c580048d847d6949371726653e02b928196bad310e3eda39ff61723f6",
    "03a6ce61fcaacd38d31d4e3ce2d506602818e3856b4b44faff1dde9642ba705976"
]);
export function ToBTCQuoteSummary(props) {
    const { swapper, getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const expiryTime = useRef();
    const [confidenceWarning, setConfidenceWarning] = useState(false);
    const [nonCustodialWarning, setNonCustodialWarning] = useState(false);
    const [loading, setLoading] = useState();
    const [success, setSuccess] = useState();
    const [refund, setRefund] = useState();
    const [error, setError] = useState();
    // console.log("[ToBTCQuoteSummary] Quote Error: ", error, confidenceWarning, nonCustodialWarning, props.notEnoughForGas);
    const [refunding, setRefunding] = useState();
    const [refunded, setRefunded] = useState();
    const onContinue = async (skipChecks) => {
        setLoading(true);
        try {
            if (props.setAmountLock)
                props.setAmountLock(true);
            await props.quote.commit(signer, null, null, skipChecks);
            const success = await props.quote.waitForPayment(null, 2);
            if (success) {
                setSuccess(true);
                setNonCustodialWarning(false);
                setConfidenceWarning(false);
                if (props.setAmountLock)
                    props.setAmountLock(false);
            }
            else {
                setSuccess(false);
                setRefund(true);
                setError("Swap failed, you can refund your prior deposit");
            }
        }
        catch (e) {
            console.error(e);
            setSuccess(false);
            setError(e.toString());
            if (props.setAmountLock)
                props.setAmountLock(false);
        }
        setLoading(false);
    };
    const onRefund = async () => {
        setRefunding(true);
        try {
            await props.quote.refund(signer);
            setRefunded(true);
            setError("Deposit refunded successfully");
            if (props.setAmountLock)
                props.setAmountLock(false);
        }
        catch (e) {
            console.error(e);
        }
        setRefunding(false);
    };
    useEffect(() => {
        if (props.quote == null)
            return () => { };
        let cancelled = false;
        if (confidenceWarning)
            setConfidenceWarning(false);
        if (props.quote.getState() === ToBTCSwapState.CREATED) {
            if (props.quote instanceof ToBTCLNSwap && props.quote.getConfidence() === 0) {
                let isSnowflake = false;
                let isNonCustodial = false;
                if (props.quote.getLightningInvoice() != null) {
                    const parsedRequest = bolt11.decode(props.quote.getLightningInvoice());
                    if (parsedRequest.tagsObject.routing_info != null) {
                        for (let route of parsedRequest.tagsObject.routing_info) {
                            isNonCustodial = true;
                            if (SNOWFLAKE_LIST.has(route.pubkey)) {
                                isSnowflake = true;
                            }
                        }
                    }
                }
                if (confidenceWarning === isSnowflake)
                    setConfidenceWarning(!isSnowflake);
                setNonCustodialWarning(!confidenceWarning && isNonCustodial);
            }
            if (signer == null)
                return;
            //Check that we have enough funds!
            const swapInput = props.quote.getInput();
            let balancePromise;
            if (props.balance != null) {
                balancePromise = Promise.resolve(props.balance);
            }
            else {
                balancePromise = swapper.getBalance(props.quote.chainIdentifier, signer.getAddress(), props.quote.data.getToken());
            }
            balancePromise.then(balance => {
                if (cancelled)
                    return;
                const hasEnoughBalance = balance.gte(swapInput.rawAmount);
                if (!hasEnoughBalance) {
                    setSuccess(false);
                    setError("You don't have enough funds to initiate the swap, balance: " + toHumanReadableString(balance, swapInput.token) + " " + swapInput.token.ticker);
                    setLoading(false);
                    return;
                }
                if (props.autoContinue)
                    onContinue(true);
            });
        }
        setSuccess(null);
        setRefund(false);
        setError(null);
        setRefunding(false);
        setRefunded(false);
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
        return () => {
            clearInterval(interval);
            cancelled = true;
        };
    }, [props.quote]);
    return (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: confidenceWarning, variant: "warning", onClose: () => setConfidenceWarning(false), dismissible: true, closeVariant: "white", children: [_jsx("strong", { children: "Payment might likely fail!" }), _jsx("label", { children: "We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!" })] }), props.type === "swap" ? _jsxs(Alert, { className: "text-center mb-3", show: nonCustodialWarning, variant: "success", onClose: () => setNonCustodialWarning(false), dismissible: true, closeVariant: "white", children: [_jsx("strong", { children: "Non-custodial wallet info" }), _jsx("label", { children: "Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!" })] }) : "", _jsxs("div", { className: success === null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] }), _jsxs(Alert, { className: "text-center mb-3", show: props.notEnoughForGas, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough SOL for fees" }), _jsx("label", { children: "You need at least 0.005 SOL to pay for fees and deposits!" })] }), success === undefined ? "" : success === null ? (quoteTimeRemaining === 0 && !loading ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: () => onContinue(), disabled: loading || props.notEnoughForGas, size: "lg", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", props.type === "payment" ? "Pay" : "Swap"] }))) : (success ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was concluded successfully" }), props.quote instanceof ToBTCSwap ? (_jsx(Button, { href: FEConstants.btcBlockExplorer + props.quote.getBitcoinTxId(), target: "_blank", variant: "success", className: "mt-3", children: "View transaction" })) : ""] })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: error })] }), refund ? (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: onRefund, className: refunded ? "d-none" : "", disabled: refunding, variant: "secondary", children: [refunding ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Refund deposit"] })) : (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" }))] })))] }));
}
