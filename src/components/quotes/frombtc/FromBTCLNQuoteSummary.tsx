import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {
    Alert,
    Badge,
    Button,
    CloseButton,
    Form,
    Modal,
    Overlay,
    OverlayTrigger,
    ProgressBar,
    Spinner,
    Tooltip
} from "react-bootstrap";
import {QRCodeSVG} from "qrcode.react";
import ValidatedInput, {ValidatedInputRef} from "../../ValidatedInput";
import {FromBTCLNSwap, FromBTCLNSwapState, LNURLPay, LNURLWithdraw} from "@atomiqlabs/sdk";
import {clipboard} from 'react-icons-kit/fa/clipboard'
import Icon from "react-icons-kit";
import {LNNFCReader, LNNFCStartResult} from "../../../lnnfc/LNNFCReader";
import {useLocation, useNavigate} from "react-router-dom";
import {WebLNContext} from "../../../context/WebLNContext";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import {info} from 'react-icons-kit/fa/info';
import {elementInViewport} from "../../../utils/Utils";
import {SwapsContext} from "../../../context/SwapsContext";
import {ButtonWithSigner} from "../../ButtonWithSigner";

export function FromBTCLNQuoteSummary(props: {
    quote: FromBTCLNSwap,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    notEnoughForGas: boolean
}) {
    const {swapper, getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const {lnWallet, setLnWallet} = useContext(WebLNContext);
    const [bitcoinError, setBitcoinError] = useState<string>(null);
    const [sendTransactionLoading, setSendTransactionLoading] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();

    const [state, setState] = useState<FromBTCLNSwapState>(null);

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const expiryTime = useRef<number>();

    const [isStarted, setStarted] = useState<boolean>();
    const [loading, setLoading] = useState<boolean>();
    const [success, setSuccess] = useState<boolean>();
    const [error, setError] = useState<string>();

    const abortControllerRef = useRef<AbortController>(new AbortController());

    const qrCodeRef = useRef();
    const textFieldRef = useRef<ValidatedInputRef>();
    const copyBtnRef = useRef();
    const [showCopyOverlay, setShowCopyOverlay] = useState<number>(0);
    const [autoClaim, setAutoClaim] = useState<boolean>(false);

    const [NFCScanning, setNFCScanning] = useState<LNNFCStartResult>(null);
    const [payingWithLNURL, setPayingWithLNURL] = useState<boolean>(false);

    const nfcScannerRef = useRef<LNNFCReader>(null);

    useEffect(() => {
        const nfcScanner = new LNNFCReader();
        if(!nfcScanner.isSupported()) return;
        nfcScanner.onScanned((lnurls: string[]) => {
            console.log("LNURL read: ", lnurls);

            if(lnurls[0]!=null) {
                swapper.getLNURLTypeAndData(lnurls[0]).then((result: LNURLPay | LNURLWithdraw) => {
                    if(result==null) return;
                    if(result.type!=="withdraw") return;
                    nfcScanner.stop();
                    props.quote.settleWithLNURLWithdraw(result as LNURLWithdraw).then(() => {
                        setPayingWithLNURL(true);
                    });
                });
            }
        });
        nfcScannerRef.current = nfcScanner;

        nfcScanner.start().then((res: LNNFCStartResult) => {
            setNFCScanning(res);
        });

        return () => {
            nfcScanner.stop();
        };
    }, []);

    const sendBitcoinTransaction = () => {
        if(sendTransactionLoading) return;
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

        setAutoClaim(config==null ? false : config==="true");

    }, []);

    const setAndSaveAutoClaim = (value: boolean) => {
        setAutoClaim(value);
        window.localStorage.setItem("crossLightning-autoClaim", ""+value);
    };

    const onCommit = async () => {
        setStarted(true);
        if(props.setAmountLock!=null) props.setAmountLock(true);
        props.quote.waitForPayment(abortControllerRef.current.signal, 2).catch(e => {
            if(abortControllerRef.current.signal.aborted) return;
            setError(e.toString());
            if(props.setAmountLock!=null) props.setAmountLock(false);
        });
        if(lnWallet!=null) {
            sendBitcoinTransaction();
        }
    };

    const onClaim = async (skipChecks?: boolean) => {
        setLoading(true);
        setError(null);
        try {
            await props.quote.commitAndClaim(signer, null, skipChecks);
            setSuccess(true);
        } catch (e) {
            setSuccess(false);
            setError(e.toString());
        }
        setLoading(false);
    };

    useEffect(() => {
        if(showCopyOverlay===0) {
            return;
        }

        const timeout = setTimeout(() => {
            setShowCopyOverlay(0);
        }, 2000);

        return () => {
            clearTimeout(timeout);
        }
    }, [showCopyOverlay]);

    useEffect(() => {

        abortControllerRef.current = new AbortController();

        if(props.quote==null) return () => {};

        setSuccess(null);
        setError(null);

        let interval;
        interval = setInterval(() => {
            let dt = expiryTime.current-Date.now();
            if(dt<=0) {
                clearInterval(interval);
                dt = 0;
                // if(props.setAmountLock!=null) props.setAmountLock(false);
                abortControllerRef.current.abort();
            }
            setQuoteTimeRemaining(Math.floor(dt/1000));
        }, 500);

        if(props.quote.getState()===FromBTCLNSwapState.CLAIM_COMMITED) {
            expiryTime.current = props.quote.getExpiry();
        } else {
            expiryTime.current = props.quote.getTimeoutTime();
        }

        const dt = Math.floor((expiryTime.current-Date.now())/1000);
        setInitialQuoteTimeout(dt);
        setQuoteTimeRemaining(dt);

        let listener;

        setState(props.quote.getState());
        // setState(FromBTCLNSwapState.PR_CREATED);

        props.quote.events.on("swapState", listener = (quote: FromBTCLNSwap<any>) => {
            setState(quote.getState());
            console.log("FromBTCLN swap state: ", quote.getState());
            // if(quote.getState()===FromBTCLNSwapState.CLAIM_CLAIMED) {
            //     if(props.setAmountLock) props.setAmountLock(false);
            // }
            if(quote.getState()===FromBTCLNSwapState.PR_PAID) {
                clearInterval(interval);
                interval = setInterval(() => {
                    let dt = expiryTime.current-Date.now();
                    if(dt<=0) {
                        clearInterval(interval);
                        dt = 0;
                        // if(props.setAmountLock!=null) props.setAmountLock(false);
                    }
                    setQuoteTimeRemaining(Math.floor(dt/1000));
                }, 500);

                expiryTime.current = quote.getExpiry();

                const dt = Math.floor((expiryTime.current-Date.now())/1000);
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
        if(
            (state===FromBTCLNSwapState.PR_CREATED && quoteTimeRemaining===0 && !loading) ||
            (state===FromBTCLNSwapState.PR_PAID && quoteTimeRemaining===0 && !loading) ||
            state===FromBTCLNSwapState.CLAIM_CLAIMED
        ) {
            if(props.quote!=null && props.setAmountLock!=null) props.setAmountLock(false);
        }
    }, [quoteTimeRemaining, loading, props.quote, state]);

    useEffect(() => {
        if(state===FromBTCLNSwapState.PR_PAID) {
            if(autoClaim || lnWallet!=null) onClaim(true);
        }
    }, [state, autoClaim]);

    useEffect(() => {
        if(isStarted) {
            let lastScrollTime: number = 0;
            let scrollListener = () => {
                lastScrollTime = Date.now();
            };
            window.addEventListener("scroll", scrollListener);

            const isScrolling = () => lastScrollTime && Date.now() < lastScrollTime + 100;

            let interval;
            interval = setInterval(() => {
                const anchorElement = document.getElementById("scrollAnchor");
                if(anchorElement==null) return;

                if(elementInViewport(anchorElement)) {
                    clearInterval(interval);
                    window.removeEventListener("scroll", scrollListener);
                    scrollListener = null;
                    interval = null;
                    return;
                }

                if(!isScrolling()) {
                    // @ts-ignore
                    window.scrollBy({
                        left: 0,
                        top: 99999
                    });
                }
            }, 100);

            return () => {
                if(interval!=null) clearInterval(interval);
                if(scrollListener!=null) window.removeEventListener("scroll", scrollListener);
            }
        }
    }, [isStarted]);

    const copy = (num: number) => {
        try {
            // @ts-ignore
            navigator.clipboard.writeText(props.quote.getAddress());
        } catch (e) {
            console.error(e);
        }

        try {
            // @ts-ignore
            textFieldRef.current.input.current.select();
            // @ts-ignore
            document.execCommand('copy');
            // @ts-ignore
            textFieldRef.current.input.current.blur();
        } catch (e) {
            console.error(e);
        }

        setShowCopyOverlay(num);
    };

    const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);

    return (
        <>
            <Modal contentClassName="text-white bg-dark" size="sm" centered show={openAppModalOpened} onHide={() => setOpenAppModalOpened(false)} dialogClassName="min-width-400px">
                <Modal.Header className="border-0">
                    <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                        <Icon icon={info} className="d-flex align-items-center me-2"/> Important notice
                        <CloseButton className="ms-auto" variant="white" onClick={() => setOpenAppModalOpened(false)}/>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Please make sure that you return back to this dApp once you inititated a Lightning Network payment from your wallet app. <b>The Lightning Network payment will only succeed/confirm once you come back to the dApp and claim the funds on the Solana side!</b></p>
                </Modal.Body>
                <Modal.Footer className="border-0 d-flex">
                    <Button variant="primary" className="flex-grow-1" onClick={() => {
                        window.location.href = props.quote.getQrData();
                        setOpenAppModalOpened(false);
                    }}>
                        Understood, continue
                    </Button>
                </Modal.Footer>
            </Modal>

            {error!=null ? (
                <Alert variant="danger" className="mb-3">
                    <strong>Swap failed</strong>
                    <label>{error}</label>
                </Alert>
            ) : ""}

            <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={props.notEnoughForGas} variant="danger" closeVariant="white">
                <strong>Not enough SOL for fees</strong>
                <label>You need at least 0.01 SOL to pay for fees and refundable deposit! You can swap for gas first & then continue swapping here!</label>
                <Button className="mt-2" variant="secondary" onClick={() => {
                    navigate("/gas", {
                        state: {
                            returnPath: location.pathname+location.search,
                            chainId: props.quote.chainIdentifier
                        }
                    });
                }}>Swap for gas</Button>
            </Alert>

            {state===FromBTCLNSwapState.PR_CREATED ? (!isStarted ? (
                <>
                    <div className={success===null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none"}>
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
                        <ButtonWithSigner signer={signer} chainId={props.quote?.chainIdentifier} onClick={onCommit} disabled={loading || props.notEnoughForGas} size="lg">
                            {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Initiate swap
                        </ButtonWithSigner>
                    )}
                </>
            ) : (
                <>
                    {quoteTimeRemaining===0 ? "" : (
                        <div className="tab-accent mb-3">
                            {payingWithLNURL ? (
                                <div className="d-flex flex-column align-items-center justify-content-center">
                                    <Spinner animation="border" />
                                    Paying via NFC card...
                                </div>
                            ) : lnWallet!=null ? (
                                <>
                                    {bitcoinError!=null ? (
                                        <Alert variant="danger" className="mb-2">
                                            <strong>Lightning TX failed</strong>
                                            <label>{bitcoinError}</label>
                                        </Alert>
                                    ) : ""}
                                    <div className="d-flex flex-column align-items-center justify-content-center">
                                        <Button variant="light" className="d-flex flex-row align-items-center" disabled={sendTransactionLoading} onClick={sendBitcoinTransaction}>
                                            {sendTransactionLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                            Pay with
                                            <img width={20} height={20} src="/wallets/WebLN.png" className="ms-2 me-1"/>
                                            WebLN
                                        </Button>
                                        <small className="mt-2"><a href="javascript:void(0);" onClick={() => setLnWallet(null)}>Or use a QR code/LN invoice</a></small>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Overlay target={showCopyOverlay===1 ? copyBtnRef.current : (showCopyOverlay===2 ? qrCodeRef.current : null)} show={showCopyOverlay>0} placement="top">
                                        {(props) => (
                                            <Tooltip id="overlay-example" {...props}>
                                                Address copied to clipboard!
                                            </Tooltip>
                                        )}
                                    </Overlay>

                                    <div ref={qrCodeRef} className="mb-2">
                                        <QRCodeSVG
                                            value={props.quote.getQrData()}
                                            size={300}
                                            includeMargin={true}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                copy(2);
                                            }}
                                            imageSettings={NFCScanning===LNNFCStartResult.OK ? {
                                                src: "/icons/contactless.png",
                                                excavate: true,
                                                height: 50,
                                                width: 50
                                            } : null}
                                        />
                                    </div>
                                    <label>Please initiate a payment to this lightning network invoice</label>
                                    <ValidatedInput
                                        type={"text"}
                                        value={props.quote.getLightningInvoice()}
                                        textEnd={(
                                            <a href="javascript:void(0);" ref={copyBtnRef} onClick={() => {
                                                copy(1);
                                            }}>
                                                <Icon icon={clipboard}/>
                                            </a>
                                        )}
                                        inputRef={textFieldRef}
                                    />
                                    <div className="d-flex justify-content-center mt-2">
                                        <Button variant="light" className="d-flex flex-row align-items-center justify-content-center" onClick={() => {
                                            setOpenAppModalOpened(true);
                                        }}>
                                            <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in Lightning wallet app
                                        </Button>
                                    </div>
                                </>
                            )}

                            {lnWallet==null ? (
                                <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-3">
                                    <Form.Check // prettier-ignore
                                        id="autoclaim"
                                        type="switch"
                                        onChange={(val) => setAndSaveAutoClaim(val.target.checked)}
                                        checked={autoClaim}
                                    />
                                    <label title="" htmlFor="autoclaim" className="form-check-label me-2">Auto-claim</label>
                                    <OverlayTrigger overlay={<Tooltip id="autoclaim-pay-tooltip">
                                        Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives.
                                    </Tooltip>}>
                                        <Badge bg="primary" className="pill-round" pill>?</Badge>
                                    </OverlayTrigger>
                                </Form>
                            ) : ""}

                        </div>
                    )}

                    {payingWithLNURL && quoteTimeRemaining!==0 ? "" : (
                        <div className="d-flex flex-column mb-3 tab-accent">
                            {quoteTimeRemaining===0 ? (
                                <label>Quote expired!</label>
                            ) : (
                                <label>Quote expires in {quoteTimeRemaining} seconds</label>
                            )}
                            <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                        </div>
                    )}

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
            )) : ""}

            {state===FromBTCLNSwapState.PR_PAID || state===FromBTCLNSwapState.CLAIM_COMMITED ? (
                <>
                    {quoteTimeRemaining!==0 ? (
                        <div className="mb-3 tab-accent">
                            <label>Lightning network payment received</label>
                            <label>Claim it below to finish the swap!</label>
                        </div>
                    ) : ""}
                    {state===FromBTCLNSwapState.PR_PAID ? (
                        <div className={!loading ? "d-flex flex-column mb-3 tab-accent" : "d-none"}>
                            {quoteTimeRemaining===0 ? (
                                <label>Swap expired! Your lightning payment should refund shortly.</label>
                            ) : (
                                <label>Offer expires in {quoteTimeRemaining} seconds</label>
                            )}
                            <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                        </div>
                    ) : ""}
                    {state===FromBTCLNSwapState.PR_PAID && quoteTimeRemaining===0 && !loading ? (
                        <Button onClick={props.refreshQuote} variant="secondary">
                            New quote
                        </Button>
                    ) : (
                        <ButtonWithSigner signer={signer} chainId={props.quote?.chainIdentifier} onClick={() => onClaim()} disabled={loading} size="lg">
                            {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Finish swap (claim funds)
                        </ButtonWithSigner>
                    )}
                </>
            ) : ""}

            {state===FromBTCLNSwapState.CLAIM_CLAIMED ? (
                <Alert variant="success" className="mb-0">
                    <strong>Swap successful</strong>
                    <label>Swap was concluded successfully</label>
                </Alert>
            ) : ""}

            <div id="scrollAnchor"></div>

        </>
    )
}