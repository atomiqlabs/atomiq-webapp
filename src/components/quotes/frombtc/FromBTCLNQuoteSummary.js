import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, CloseButton, Form, Modal, Overlay, OverlayTrigger, ProgressBar, Spinner, Tooltip } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import ValidatedInput from "../../ValidatedInput";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { clipboard } from 'react-icons-kit/fa/clipboard';
import Icon from "react-icons-kit";
import { LNNFCReader, LNNFCStartResult } from "../../../lnnfc/LNNFCReader";
import { useLocation, useNavigate } from "react-router-dom";
import { WebLNContext } from "../../../context/WebLNContext";
import { externalLink } from 'react-icons-kit/fa/externalLink';
import { info } from 'react-icons-kit/fa/info';
import { elementInViewport } from "../../../utils/Utils";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
export function FromBTCLNQuoteSummary(props) {
    const { swapper, getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { lnWallet, setLnWallet } = useContext(WebLNContext);
    const [bitcoinError, setBitcoinError] = useState(null);
    const [sendTransactionLoading, setSendTransactionLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [state, setState] = useState(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const expiryTime = useRef();
    const [isStarted, setStarted] = useState();
    const [loading, setLoading] = useState();
    const [success, setSuccess] = useState();
    const [error, setError] = useState();
    const abortControllerRef = useRef(new AbortController());
    const qrCodeRef = useRef();
    const textFieldRef = useRef();
    const copyBtnRef = useRef();
    const [showCopyOverlay, setShowCopyOverlay] = useState(0);
    const [autoClaim, setAutoClaim] = useState(false);
    const [NFCScanning, setNFCScanning] = useState(null);
    const [payingWithLNURL, setPayingWithLNURL] = useState(false);
    const nfcScannerRef = useRef(null);
    useEffect(() => {
        const nfcScanner = new LNNFCReader();
        if (!nfcScanner.isSupported())
            return;
        nfcScanner.onScanned((lnurls) => {
            console.log("LNURL read: ", lnurls);
            if (lnurls[0] != null) {
                swapper.getLNURLTypeAndData(lnurls[0]).then((result) => {
                    if (result == null)
                        return;
                    if (result.type !== "withdraw")
                        return;
                    nfcScanner.stop();
                    props.quote.settleWithLNURLWithdraw(result).then(() => {
                        setPayingWithLNURL(true);
                    });
                });
            }
        });
        nfcScannerRef.current = nfcScanner;
        nfcScanner.start().then((res) => {
            setNFCScanning(res);
        });
        return () => {
            nfcScanner.stop();
        };
    }, []);
    const sendBitcoinTransaction = () => {
        if (sendTransactionLoading)
            return;
        setSendTransactionLoading(true);
        setBitcoinError(null);
        lnWallet.sendPayment(props.quote.getLightningInvoice()).then(resp => {
            setSendTransactionLoading(false);
        }).catch(e => {
            setSendTransactionLoading(false);
            console.error(e);
            setBitcoinError(e.message);
        });
    };
    useEffect(() => {
        setBitcoinError(null);
    }, [lnWallet]);
    useEffect(() => {
        const config = window.localStorage.getItem("crossLightning-autoClaim");
        setAutoClaim(config == null ? false : config === "true");
    }, []);
    const setAndSaveAutoClaim = (value) => {
        setAutoClaim(value);
        window.localStorage.setItem("crossLightning-autoClaim", "" + value);
    };
    const onCommit = async () => {
        setStarted(true);
        if (props.setAmountLock != null)
            props.setAmountLock(true);
        props.quote.waitForPayment(abortControllerRef.current.signal, 2).catch(e => {
            if (abortControllerRef.current.signal.aborted)
                return;
            setError(e.toString());
            if (props.setAmountLock != null)
                props.setAmountLock(false);
        });
        if (lnWallet != null) {
            sendBitcoinTransaction();
        }
    };
    const onClaim = async (skipChecks) => {
        setLoading(true);
        setError(null);
        try {
            await props.quote.commitAndClaim(signer, null, skipChecks);
            setSuccess(true);
        }
        catch (e) {
            setSuccess(false);
            setError(e.toString());
        }
        setLoading(false);
    };
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
    useEffect(() => {
        abortControllerRef.current = new AbortController();
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
                // if(props.setAmountLock!=null) props.setAmountLock(false);
                abortControllerRef.current.abort();
            }
            setQuoteTimeRemaining(Math.floor(dt / 1000));
        }, 500);
        if (props.quote.getState() === FromBTCLNSwapState.CLAIM_COMMITED) {
            expiryTime.current = props.quote.getExpiry();
        }
        else {
            expiryTime.current = props.quote.getTimeoutTime();
        }
        const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
        setInitialQuoteTimeout(dt);
        setQuoteTimeRemaining(dt);
        let listener;
        setState(props.quote.getState());
        // setState(FromBTCLNSwapState.PR_CREATED);
        props.quote.events.on("swapState", listener = (quote) => {
            setState(quote.getState());
            console.log("FromBTCLN swap state: ", quote.getState());
            // if(quote.getState()===FromBTCLNSwapState.CLAIM_CLAIMED) {
            //     if(props.setAmountLock) props.setAmountLock(false);
            // }
            if (quote.getState() === FromBTCLNSwapState.PR_PAID) {
                clearInterval(interval);
                interval = setInterval(() => {
                    let dt = expiryTime.current - Date.now();
                    if (dt <= 0) {
                        clearInterval(interval);
                        dt = 0;
                        // if(props.setAmountLock!=null) props.setAmountLock(false);
                    }
                    setQuoteTimeRemaining(Math.floor(dt / 1000));
                }, 500);
                expiryTime.current = quote.getExpiry();
                const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
                console.log("FromBTCLN swap state PR_PAID, dt: ", dt);
                setInitialQuoteTimeout(dt);
                setQuoteTimeRemaining(dt);
            }
        });
        return () => {
            clearInterval(interval);
            props.quote.events.removeListener("swapState", listener);
            abortControllerRef.current.abort();
        };
    }, [props.quote]);
    useEffect(() => {
        if ((state === FromBTCLNSwapState.PR_CREATED && quoteTimeRemaining === 0 && !loading) ||
            (state === FromBTCLNSwapState.PR_PAID && quoteTimeRemaining === 0 && !loading) ||
            state === FromBTCLNSwapState.CLAIM_CLAIMED) {
            if (props.quote != null && props.setAmountLock != null)
                props.setAmountLock(false);
        }
    }, [quoteTimeRemaining, loading, props.quote, state]);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_PAID) {
            if (autoClaim || lnWallet != null)
                onClaim(true);
        }
    }, [state, autoClaim]);
    useEffect(() => {
        if (isStarted) {
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
    }, [isStarted]);
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
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: openAppModalOpened, onHide: () => setOpenAppModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Important notice", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setOpenAppModalOpened(false) })] }) }), _jsx(Modal.Body, { children: _jsxs("p", { children: ["Please make sure that you return back to this dApp once you inititated a Lightning Network payment from your wallet app. ", _jsx("b", { children: "The Lightning Network payment will only succeed/confirm once you come back to the dApp and claim the funds on the Solana side!" })] }) }), _jsx(Modal.Footer, { className: "border-0 d-flex", children: _jsx(Button, { variant: "primary", className: "flex-grow-1", onClick: () => {
                                window.location.href = props.quote.getQrData();
                                setOpenAppModalOpened(false);
                            }, children: "Understood, continue" }) })] }), error != null ? (_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: error })] })) : "", _jsxs(Alert, { className: "text-center mb-3 d-flex align-items-center flex-column", show: props.notEnoughForGas, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough SOL for fees" }), _jsx("label", { children: "You need at least 0.01 SOL to pay for fees and refundable deposit! You can swap for gas first & then continue swapping here!" }), _jsx(Button, { className: "mt-2", variant: "secondary", onClick: () => {
                            navigate("/gas", {
                                state: {
                                    returnPath: location.pathname + location.search,
                                    chainId: props.quote.chainIdentifier
                                }
                            });
                        }, children: "Swap for gas" })] }), state === FromBTCLNSwapState.PR_CREATED ? (!isStarted ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: success === null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] }), quoteTimeRemaining === 0 && !loading ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: onCommit, disabled: loading || props.notEnoughForGas, size: "lg", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Initiate swap"] }))] })) : (_jsxs(_Fragment, { children: [quoteTimeRemaining === 0 ? "" : (_jsxs("div", { className: "tab-accent mb-3", children: [payingWithLNURL ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsx(Spinner, { animation: "border" }), "Paying via NFC card..."] })) : lnWallet != null ? (_jsxs(_Fragment, { children: [bitcoinError != null ? (_jsxs(Alert, { variant: "danger", className: "mb-2", children: [_jsx("strong", { children: "Lightning TX failed" }), _jsx("label", { children: bitcoinError })] })) : "", _jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center", disabled: sendTransactionLoading, onClick: sendBitcoinTransaction, children: [sendTransactionLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with", _jsx("img", { width: 20, height: 20, src: "/wallets/WebLN.png", className: "ms-2 me-1" }), "WebLN"] }), _jsx("small", { className: "mt-2", children: _jsx("a", { href: "javascript:void(0);", onClick: () => setLnWallet(null), children: "Or use a QR code/LN invoice" }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx(Overlay, { target: showCopyOverlay === 1 ? copyBtnRef.current : (showCopyOverlay === 2 ? qrCodeRef.current : null), show: showCopyOverlay > 0, placement: "top", children: (props) => (_jsx(Tooltip, { id: "overlay-example", ...props, children: "Address copied to clipboard!" })) }), _jsx("div", { ref: qrCodeRef, className: "mb-2", children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true, className: "cursor-pointer", onClick: () => {
                                                copy(2);
                                            }, imageSettings: NFCScanning === LNNFCStartResult.OK ? {
                                                src: "/icons/contactless.png",
                                                excavate: true,
                                                height: 50,
                                                width: 50
                                            } : null }) }), _jsx("label", { children: "Please initiate a payment to this lightning network invoice" }), _jsx(ValidatedInput, { type: "text", value: props.quote.getLightningInvoice(), textEnd: (_jsx("a", { href: "javascript:void(0);", ref: copyBtnRef, onClick: () => {
                                                copy(1);
                                            }, children: _jsx(Icon, { icon: clipboard }) })), inputRef: textFieldRef }), _jsx("div", { className: "d-flex justify-content-center mt-2", children: _jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center justify-content-center", onClick: () => {
                                                setOpenAppModalOpened(true);
                                            }, children: [_jsx(Icon, { icon: externalLink, className: "d-flex align-items-center me-2" }), " Open in Lightning wallet app"] }) })] })), lnWallet == null ? (_jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-3", children: [_jsx(Form.Check // prettier-ignore
                                    , { id: "autoclaim", type: "switch", onChange: (val) => setAndSaveAutoClaim(val.target.checked), checked: autoClaim }), _jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label me-2", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })) : ""] })), payingWithLNURL && quoteTimeRemaining !== 0 ? "" : (_jsxs("div", { className: "d-flex flex-column mb-3 tab-accent", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Quote expired!" })) : (_jsxs("label", { children: ["Quote expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] })), quoteTimeRemaining === 0 ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsx(Button, { onClick: props.abortSwap, variant: "danger", children: "Abort swap" }))] }))) : "", state === FromBTCLNSwapState.PR_PAID || state === FromBTCLNSwapState.CLAIM_COMMITED ? (_jsxs(_Fragment, { children: [quoteTimeRemaining !== 0 ? (_jsxs("div", { className: "mb-3 tab-accent", children: [_jsx("label", { children: "Lightning network payment received" }), _jsx("label", { children: "Claim it below to finish the swap!" })] })) : "", state === FromBTCLNSwapState.PR_PAID ? (_jsxs("div", { className: !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none", children: [quoteTimeRemaining === 0 ? (_jsx("label", { children: "Swap expired! Your lightning payment should refund shortly." })) : (_jsxs("label", { children: ["Offer expires in ", quoteTimeRemaining, " seconds"] })), _jsx(ProgressBar, { animated: true, now: quoteTimeRemaining, max: initialQuoteTimeout, min: 0 })] })) : "", state === FromBTCLNSwapState.PR_PAID && quoteTimeRemaining === 0 && !loading ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : (_jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: loading, size: "lg", children: [loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Finish swap (claim funds)"] }))] })) : "", state === FromBTCLNSwapState.CLAIM_CLAIMED ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was concluded successfully" })] })) : "", _jsx("div", { id: "scrollAnchor" })] }));
}
