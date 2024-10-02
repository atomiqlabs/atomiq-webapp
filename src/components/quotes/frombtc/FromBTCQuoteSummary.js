import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Overlay, ProgressBar, Spinner, Tooltip } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import { btcCurrency, toHumanReadableString } from "../../../utils/Currencies";
import ValidatedInput from "../../ValidatedInput";
import { FromBTCSwapState } from "sollightning-sdk";
import Icon from "react-icons-kit";
import { clipboard } from "react-icons-kit/fa/clipboard";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { BitcoinWalletContext } from "../../../context/BitcoinWalletContext";
import { externalLink } from 'react-icons-kit/fa/externalLink';
import { elementInViewport, getDeltaText, getDeltaTextHours } from "../../../utils/Utils";
import { FEConstants } from "../../../FEConstants";
export function FromBTCQuoteSummary(props) {
    const { bitcoinWallet, setBitcoinWallet } = useContext(BitcoinWalletContext);
    const [bitcoinError, setBitcoinError] = useState(null);
    const [sendTransactionLoading, setSendTransactionLoading] = useState(false);
    const txLoading = useRef(false);
    const [transactionSent, setTransactionSent] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [state, setState] = useState(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const expiryTime = useRef();
    const [loading, setLoading] = useState();
    const [success, setSuccess] = useState();
    const [error, setError] = useState();
    const qrCodeRef = useRef();
    const textFieldRef = useRef();
    const copyBtnRef = useRef();
    const [showCopyOverlay, setShowCopyOverlay] = useState(0);
    useEffect(() => {
        if (showCopyOverlay === 0) {
            return;
        }
        const timeout = setTimeout(() => {
            setShowCopyOverlay(0);
        }, 2000);
        return () => {
            clearTimeout(timeout);
        };
    }, [showCopyOverlay]);
    const [txData, setTxData] = useState(null);
    const sendBitcoinTransaction = () => {
        console.log("Send bitcoin transaction called!");
        if (txLoading.current)
            return;
        setSendTransactionLoading(true);
        txLoading.current = true;
        setBitcoinError(null);
        bitcoinWallet.sendTransaction(props.quote.getBitcoinAddress(), props.quote.getInAmount(), props.feeRate != null && props.feeRate !== 0 ? props.feeRate : null).then(txId => {
            setSendTransactionLoading(false);
            txLoading.current = false;
            setTransactionSent(txId);
        }).catch(e => {
            setSendTransactionLoading(false);
            txLoading.current = false;
            console.error(e);
            setBitcoinError(e.message);
        });
    };
    useEffect(() => {
        setBitcoinError(null);
    }, [bitcoinWallet]);
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
            setQuoteTimeRemaining(dt);
        }, 500);
        expiryTime.current = props.quote.getExpiry();
        const dt = expiryTime.current - Date.now();
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
                props.quote.getBitcoinPayment().then(resp => {
                    if (resp == null && bitcoinWallet != null) {
                        sendBitcoinTransaction();
                    }
                });
                if (!paymentSubscribed) {
                    props.quote.waitForBitcoinTransaction(abortController.signal, null, (txId, confirmations, confirmationTarget, txEtaMs) => {
                        console.log("Tx eta: ", txEtaMs);
                        setTxData({
                            txId,
                            confirmations,
                            confTarget: confirmationTarget,
                            txEtaMs
                        });
                    }).catch(e => console.error(e));
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
                        setQuoteTimeRemaining(dt);
                    }, 500);
                    expiryTime.current = props.quote.getTimeoutTime();
                    const dt = expiryTime.current - Date.now();
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
            console.error(e);
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
            console.error(e);
            setSuccess(false);
            setError(e.toString());
        }
    };
    useEffect(() => {
        if (state === FromBTCSwapState.CLAIM_COMMITED) {
            let lastScrollTime = 0;
            let scrollListener = () => {
                lastScrollTime = Date.now();
            };
            window.addEventListener("scroll", scrollListener);
            const isScrolling = () => lastScrollTime && Date.now() < lastScrollTime + 100;
            let interval;
            interval = setInterval(() => {
                const anchorElement = document.getElementById("scrollAnchor");
                if (anchorElement == null)
                    return;
                if (elementInViewport(anchorElement)) {
                    clearInterval(interval);
                    window.removeEventListener("scroll", scrollListener);
                    scrollListener = null;
                    interval = null;
                    return;
                }
                if (!isScrolling()) {
                    // @ts-ignore
                    window.scrollBy({
                        left: 0,
                        top: 99999
                    });
                }
            }, 100);
            return () => {
                if (interval != null)
                    clearInterval(interval);
                if (scrollListener != null)
                    window.removeEventListener("scroll", scrollListener);
            };
        }
    }, [state]);
    const copy = (num) => {
        try {
            // @ts-ignore
            navigator.clipboard.writeText(props.quote.getAddress());
        }
        catch (e) {
            console.error(e);
        }
        try {
            // @ts-ignore
            textFieldRef.current.input.current.select();
            // @ts-ignore
            document.execCommand('copy');
            // @ts-ignore
            textFieldRef.current.input.current.blur();
        }
        catch (e) {
            console.error(e);
        }
        setShowCopyOverlay(num);
    };
    const hasEnoughBalance = props.balance == null || props.quote == null ? true : props.balance.gte(props.quote.getInAmount());
    //TODO: Add subtitle to the button: "Create bitcoin swap address"
    return (_jsxs(_Fragment, { children: [state !== FromBTCSwapState.CLAIM_CLAIMED && error != null ? (_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: error })] })) : "", _jsxs(Alert, { className: "text-center mb-3 d-flex align-items-center flex-column", show: props.notEnoughForGas, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough SOL for fees" }), _jsxs("label", { children: ["You need at least 0.01 SOL to pay for fees and refundable deposit! You can use ", _jsx("b", { children: "Bitcoin Lightning" }), " to swap for gas first & then continue swapping here!"] }), _jsx(Button, { className: "mt-2", variant: "secondary", onClick: () => {
                            navigate("/gas", {
                                state: {
                                    returnPath: location.pathname + location.search
                                }
                            });
                        }, children: "Swap for gas" })] }), state === FromBTCSwapState.PR_CREATED ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: success === null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", getDeltaTextHours(quoteTimeRemaining)] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] }), quoteTimeRemaining === 0 && !loading ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsxs(Button, { onClick: onCommit, disabled: loading || props.notEnoughForGas || !hasEnoughBalance, size: "lg", className: "d-flex flex-row", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Initiate swap"] }))] })) : "", state === FromBTCSwapState.CLAIM_COMMITED ? (txData == null ? (_jsxs(_Fragment, { children: [quoteTimeRemaining === 0 ? "" : (_jsx("div", { className: "mb-3 tab-accent", children: bitcoinWallet != null ? (_jsxs(_Fragment, { children: [bitcoinError != null ? (_jsxs(Alert, { variant: "danger", className: "mb-2", children: [_jsx("strong", { children: "Btc TX failed" }), _jsx("label", { children: bitcoinError })] })) : "", _jsx("div", { className: "d-flex flex-column align-items-center justify-content-center", children: transactionSent != null ? (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx(Spinner, {}), _jsx("label", { children: "Sending Bitcoin transaction..." })] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center", disabled: sendTransactionLoading, onClick: sendBitcoinTransaction, children: [sendTransactionLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with", _jsx("img", { width: 20, height: 20, src: bitcoinWallet.getIcon(), className: "ms-2 me-1" }), bitcoinWallet.getName()] }), _jsx("small", { className: "mt-2", children: _jsx("a", { href: "javascript:void(0);", onClick: () => setBitcoinWallet(null), children: "Or use a QR code/wallet address" }) })] })) })] })) : (_jsxs(_Fragment, { children: [_jsx(Overlay, { target: showCopyOverlay === 1 ? copyBtnRef.current : (showCopyOverlay === 2 ? qrCodeRef.current : null), show: showCopyOverlay > 0, placement: "top", children: (props) => (_jsx(Tooltip, { id: "overlay-example", ...props, children: "Address copied to clipboard!" })) }), _jsx(Alert, { variant: "warning", className: "mb-3", children: _jsxs("label", { children: ["Please make sure that you send an ", _jsx("b", { children: _jsx("u", { children: "EXACT" }) }), " amount in BTC, different amount wouldn't be accepted and you might loose funds!"] }) }), _jsx("div", { ref: qrCodeRef, className: "mb-2", children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true, className: "cursor-pointer", onClick: () => {
                                            copy(2);
                                        } }) }), _jsxs("label", { children: ["Please send exactly ", _jsx("strong", { children: toHumanReadableString(props.quote.getInAmount(), btcCurrency) }), " ", btcCurrency.ticker, " to the address"] }), _jsx(ValidatedInput, { type: "text", value: props.quote.getBitcoinAddress(), textEnd: (_jsx("a", { href: "javascript:void(0);", ref: copyBtnRef, onClick: () => {
                                            copy(1);
                                        }, children: _jsx(Icon, { icon: clipboard }) })), inputRef: textFieldRef }), _jsx("div", { className: "d-flex justify-content-center mt-2", children: _jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center justify-content-center", onClick: () => {
                                            window.location.href = props.quote.getQrData();
                                        }, children: [_jsx(Icon, { icon: externalLink, className: "d-flex align-items-center me-2" }), " Open in BTC wallet app"] }) })] })) })), _jsxs("div", { className: "d-flex flex-column mb-3 tab-accent", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Swap address expired, please do not send any funds!" })) : (_jsxs("label", { children: ["Swap address expires in ", getDeltaTextHours(quoteTimeRemaining)] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] }), quoteTimeRemaining === 0 ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" }))] })) : (_jsxs("div", { className: "d-flex flex-column align-items-center tab-accent", children: [_jsx("small", { className: "mb-2", children: "Transaction successfully received, waiting for confirmations..." }), _jsx(Spinner, {}), _jsxs("label", { children: [txData.confirmations, " / ", txData.confTarget] }), _jsx("label", { style: { marginTop: "-6px" }, children: "Confirmations" }), _jsx("a", { className: "mb-2 text-overflow-ellipsis text-nowrap overflow-hidden", style: { width: "100%" }, target: "_blank", href: FEConstants.btcBlockExplorer + txData.txId, children: _jsx("small", { children: txData.txId }) }), _jsxs(Badge, { className: "text-black", bg: "light", pill: true, children: ["ETA: ", txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)] })] }))) : "", state === FromBTCSwapState.BTC_TX_CONFIRMED ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "d-flex flex-column align-items-center tab-accent mb-3", children: _jsx("label", { children: "Transaction received & confirmed" }) }), _jsxs(Button, { onClick: onClaim, disabled: loading, size: "lg", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] })] })) : "", state === FromBTCSwapState.CLAIM_CLAIMED ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was concluded successfully" })] })) : "", _jsx("div", { id: "scrollAnchor" })] }));
}
