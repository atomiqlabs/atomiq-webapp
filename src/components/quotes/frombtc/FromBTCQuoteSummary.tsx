import {useContext, useEffect, useRef, useState} from "react";
import {Alert, Badge, Button, Overlay, ProgressBar, Spinner, Tooltip} from "react-bootstrap";
import {QRCodeSVG} from "qrcode.react";
import {btcCurrency, toHumanReadableString} from "../../../utils/Currencies";
import ValidatedInput, {ValidatedInputRef} from "../../ValidatedInput";
import {FromBTCSwap, FromBTCSwapState} from "sollightning-sdk";
import Icon from "react-icons-kit";
import {clipboard} from "react-icons-kit/fa/clipboard";
import {LNNFCReader} from "../../../lnnfc/LNNFCReader";
import * as React from "react";
import {useLocation} from "react-router-dom";
import {useNavigate} from "react-router-dom";
import {BitcoinWalletContext} from "../../../context/BitcoinWalletContext";
import * as BN from "bn.js";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import {elementInViewport, getDeltaText, getDeltaTextHours} from "../../../utils/Utils";
import {FEConstants} from "../../../FEConstants";

export function FromBTCQuoteSummary(props: {
    quote: FromBTCSwap<any>,
    refreshQuote: () => void,
    setAmountLock: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    notEnoughForGas: boolean,
    feeRate?: number,
    balance?: BN
}) {
    const {bitcoinWallet, setBitcoinWallet} = useContext(BitcoinWalletContext);
    const [bitcoinError, setBitcoinError] = useState<string>(null);
    const [sendTransactionLoading, setSendTransactionLoading] = useState<boolean>(false);
    const txLoading = useRef<boolean>(false);
    const [transactionSent, setTransactionSent] = useState<string>(null);

    const navigate = useNavigate();
    const location = useLocation();

    const [state, setState] = useState<FromBTCSwapState>(null);

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const expiryTime = useRef<number>();

    const [loading, setLoading] = useState<boolean>();
    const [success, setSuccess] = useState<boolean>();
    const [error, setError] = useState<string>();

    const qrCodeRef = useRef();
    const textFieldRef = useRef<ValidatedInputRef>();
    const copyBtnRef = useRef();
    const [showCopyOverlay, setShowCopyOverlay] = useState<number>(0);

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

    const [txData, setTxData] = useState<{
        txId: string,
        confirmations: number,
        confTarget: number,
        txEtaMs: number
    }>(null);

    const sendBitcoinTransaction = () => {
        console.log("Send bitcoin transaction called!");
        if(txLoading.current) return;
        setSendTransactionLoading(true);
        txLoading.current = true;
        setBitcoinError(null);
        bitcoinWallet.sendTransaction(props.quote.getBitcoinAddress(), props.quote.getInAmount(), props.feeRate!=null && props.feeRate!==0 ? props.feeRate : null).then(txId => {
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
            setQuoteTimeRemaining(dt);
        }, 500);

        expiryTime.current = props.quote.getExpiry();

        const dt = expiryTime.current-Date.now();
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
                props.quote.getBitcoinPayment().then(resp => {
                    if(resp==null && bitcoinWallet!=null) {
                        sendBitcoinTransaction();
                    }
                });
                if(!paymentSubscribed) {
                    props.quote.waitForBitcoinTransaction(abortController.signal, null, (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
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
                        setQuoteTimeRemaining(dt);
                    }, 500);

                    expiryTime.current = props.quote.getTimeoutTime();
                    const dt = expiryTime.current-Date.now();
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
            console.error(e);
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
            console.error(e);
            setSuccess(false);
            setError(e.toString());
        }
    };

    useEffect(() => {
        if(state===FromBTCSwapState.CLAIM_COMMITED) {
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
    }, [state]);

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

    const hasEnoughBalance = props.balance==null || props.quote==null ? true : props.balance.gte(props.quote.getInAmount());

    //TODO: Add subtitle to the button: "Create bitcoin swap address"
    return (
        <>
            {state!==FromBTCSwapState.CLAIM_CLAIMED && error!=null ? (
                <Alert variant="danger" className="mb-3">
                    <strong>Swap failed</strong>
                    <label>{error}</label>
                </Alert>
            ) : ""}

            <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={props.notEnoughForGas} variant="danger" closeVariant="white">
                <strong>Not enough SOL for fees</strong>
                <label>You need at least 0.01 SOL to pay for fees and refundable deposit! You can use <b>Bitcoin Lightning</b> to swap for gas first & then continue swapping here!</label>
                <Button className="mt-2" variant="secondary" onClick={() => {
                    navigate("/gas", {
                        state: {
                            returnPath: location.pathname+location.search
                        }
                    });
                }}>Swap for gas</Button>
            </Alert>

            {state===FromBTCSwapState.PR_CREATED ? (
                <>
                    <div className={success===null && !loading ? "d-flex flex-column mb-3 tab-accent" : "d-none"}>
                        {quoteTimeRemaining===0 ? (
                            <label>Quote expired!</label>
                        ) : (
                            <label>Quote expires in {getDeltaTextHours(quoteTimeRemaining)}</label>
                        )}
                        <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                    </div>
                    {quoteTimeRemaining===0 && !loading ? (
                        <Button onClick={props.refreshQuote} variant="secondary">
                            New quote
                        </Button>
                    ) : (
                        <Button onClick={onCommit} disabled={loading || props.notEnoughForGas || !hasEnoughBalance} size="lg" className="d-flex flex-row">
                            {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Initiate swap
                        </Button>
                    )}
                </>
            ) : ""}

            {state===FromBTCSwapState.CLAIM_COMMITED ? (txData==null ? (
                <>
                    {quoteTimeRemaining===0 ? "" : (
                        <div className="mb-3 tab-accent">
                            {bitcoinWallet!=null ? (
                                <>
                                    {bitcoinError!=null ? (
                                        <Alert variant="danger" className="mb-2">
                                            <strong>Btc TX failed</strong>
                                            <label>{bitcoinError}</label>
                                        </Alert>
                                    ) : ""}
                                    <div className="d-flex flex-column align-items-center justify-content-center">
                                        {transactionSent!=null ? (
                                            <div className="d-flex flex-column align-items-center tab-accent">
                                                <Spinner/>
                                                <label>Sending Bitcoin transaction...</label>
                                            </div>
                                        ) : (
                                            <>
                                                <Button variant="light" className="d-flex flex-row align-items-center" disabled={sendTransactionLoading} onClick={sendBitcoinTransaction}>
                                                    {sendTransactionLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                                                    Pay with
                                                    <img width={20} height={20} src={bitcoinWallet.getIcon()} className="ms-2 me-1"/>
                                                    {bitcoinWallet.getName()}
                                                </Button>
                                                <small className="mt-2"><a href="javascript:void(0);" onClick={() => setBitcoinWallet(null)}>Or use a QR code/wallet address</a></small>
                                            </>
                                        )}
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
                                    <Alert variant="warning" className="mb-3">
                                        <label>Please make sure that you send an <b><u>EXACT</u></b> amount in BTC, different amount wouldn't be accepted and you might loose funds!</label>
                                    </Alert>
                                    <div ref={qrCodeRef} className="mb-2">
                                        <QRCodeSVG
                                            value={props.quote.getQrData()}
                                            size={300}
                                            includeMargin={true}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                copy(2);
                                            }}
                                        />
                                    </div>
                                    <label>Please send exactly <strong>{toHumanReadableString(props.quote.getInAmount(), btcCurrency)}</strong> {btcCurrency.ticker} to the address</label>
                                    <ValidatedInput
                                        type={"text"}
                                        value={props.quote.getBitcoinAddress()}
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
                                            window.location.href = props.quote.getQrData();
                                        }}>
                                            <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in BTC wallet app
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <div className="d-flex flex-column mb-3 tab-accent">
                        {quoteTimeRemaining===0 ? (
                            <label>Swap address expired, please do not send any funds!</label>
                        ) : (
                            <label>Swap address expires in {getDeltaTextHours(quoteTimeRemaining)}</label>
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
                <div className="d-flex flex-column align-items-center tab-accent">
                    <small className="mb-2">Transaction successfully received, waiting for confirmations...</small>

                    <Spinner/>
                    <label>{txData.confirmations} / {txData.confTarget}</label>
                    <label style={{marginTop: "-6px"}}>Confirmations</label>

                    <a className="mb-2 text-overflow-ellipsis text-nowrap overflow-hidden" style={{width: "100%"}} target="_blank" href={FEConstants.btcBlockExplorer+txData.txId}><small>{txData.txId}</small></a>

                    <Badge className="text-black" bg="light"
                           pill>ETA: {txData.txEtaMs === -1 || txData.txEtaMs > (60 * 60 * 1000) ? ">1 hour" : "~" + getDeltaText(txData.txEtaMs)}</Badge>
                </div>
            )) : ""}

            {state === FromBTCSwapState.BTC_TX_CONFIRMED ? (
                <>
                <div className="d-flex flex-column align-items-center tab-accent mb-3">
                        <label>Transaction received & confirmed</label>
                    </div>

                    <Button onClick={onClaim} disabled={loading} size="lg">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Finish swap (claim funds)
                    </Button>
                </>
            ) : ""}

            {state===FromBTCSwapState.CLAIM_CLAIMED ? (
                <Alert variant="success" className="mb-0">
                    <strong>Swap successful</strong>
                    <label>Swap was concluded successfully</label>
                </Alert>
            ) : ""}

            <div id="scrollAnchor"></div>

        </>
    )
}