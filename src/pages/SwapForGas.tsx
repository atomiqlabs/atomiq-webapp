import {Alert, Button, Overlay, ProgressBar, Spinner, Tooltip} from "react-bootstrap";
import {useLocation, useNavigate} from "react-router-dom";
import {SwapTopbar} from "../components/SwapTopbar";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import Icon from "react-icons-kit";
import {LnForGasSwap, Tokens} from "@atomiqlabs/sdk";
import * as BN from "bn.js";
import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
import {QRCodeSVG} from "qrcode.react";
import {clipboard} from "react-icons-kit/fa/clipboard";
import {ic_south} from 'react-icons-kit/md/ic_south'
import {useContext} from "react";
import {WebLNContext} from "../context/WebLNContext";
import {WebLNAnchor} from "../components/wallet/WebLNButton";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import {SwapsContext} from "../context/SwapsContext";
import {TokenIcon} from "../components/TokenIcon";

const defaultSwapAmount = "12500000";

export function SwapForGas() {
    const {swapper, chains} = useContext(SwapsContext);

    const navigate = useNavigate();

    const {search, state} = useLocation() as {search: string, state: {returnPath?: string, chainId?: string, amount: string}};
    const chainId = state?.chainId ?? "SOLANA";
    const amount = new BN(state?.amount ?? defaultSwapAmount);

    const {lnWallet, setLnWallet} = useContext(WebLNContext);
    const [bitcoinError, setBitcoinError] = useState<string>(null);
    const [sendTransactionLoading, setSendTransactionLoading] = useState<boolean>(false);

    const [swapData, setSwapData] = useState<LnForGasSwap>(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>(0);
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>(0);
    const expiryTime = useRef<number>();

    const [loading, setLoading] = useState<boolean>(null);
    const [error, setError] = useState<string>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const abortControllerRef = useRef<AbortController>(null);
    const intervalRef = useRef<number>(null);

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

    const sendBitcoinTransaction = () => {
        if(sendTransactionLoading) return;
        setSendTransactionLoading(true);
        setBitcoinError(null);
        lnWallet.sendPayment(swapData.getLightningInvoice()).then(resp => {
            setSendTransactionLoading(false);
        }).catch(e => {
            setSendTransactionLoading(false);
            console.error(e);
            setBitcoinError(e.message);
        });
    };

    const createSwap = () => {
        if(
            chains[chainId]==null ||
            chains[chainId].random
        ) return;
        setLoading(true);
        setError(null);
        setSuccess(false);
        swapper.createTrustedLNForGasSwap(chainId, chains[chainId].signer.getAddress(), amount).then(swap => {
            if(abortControllerRef.current.signal.aborted) return;
            setLoading(false);
            setSwapData(swap);

            if(intervalRef.current!=null) clearInterval(intervalRef.current);
            let interval;
            interval = setInterval(() => {
                let dt = expiryTime.current-Date.now();
                if(dt<=0) {
                    clearInterval(interval);
                    if(interval===intervalRef.current) intervalRef.current = null;
                    dt = 0;
                }
                setQuoteTimeRemaining(Math.floor(dt/1000));
            }, 500);
            intervalRef.current = interval;

            expiryTime.current = swap.getTimeoutTime();

            const dt = Math.floor((expiryTime.current-Date.now())/1000);
            setInitialQuoteTimeout(dt);
            setQuoteTimeRemaining(dt);

            return swap.waitForPayment(abortControllerRef.current.signal, 2);
        }).then(() => {
            setSuccess(true);
        }).catch(err => {
            console.error(err);
            setError(err.toString());
            if(intervalRef.current!=null) clearInterval(intervalRef.current);
            setQuoteTimeRemaining(0);
            setInitialQuoteTimeout(0);
            setSwapData(null);
            setLoading(false);
        });
    };

    useEffect(() => {
        abortControllerRef.current = new AbortController();
        if(swapper==null) return () => {};

        createSwap();

        return () => {
            abortControllerRef.current.abort();
            if(intervalRef.current!=null) clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [swapper]);

    const copy = (num: number) => {
        try {
            // @ts-ignore
            navigator.clipboard.writeText(swapData.getAddress());
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

    const nativeCurrency = swapper==null ? null : swapper.getNativeToken(chainId);

    return (
        <>
            <SwapTopbar selected={3} enabled={true}/>

            <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
                <div className="quickscan-summary-panel d-flex flex-column flex-fill">
                    <div className="p-3 d-flex flex-column tab-bg border-0 card mb-3">
                        {error ? (
                            <Alert variant={"danger"} className="mb-3">
                                <p><strong>Loading error</strong></p>
                                {error}
                            </Alert>
                        ) : ""}

                        {success ? (
                            <Alert variant={"success"} className="mb-3">
                                <p><strong>Swap successful</strong></p>
                                Successfully swapped {swapData.getInput().amount} BTC to {swapData.getOutput().amount} SOL
                            </Alert>
                        ) : ""}

                        <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={swapData!=null && !success && !error} variant="success" closeVariant="white">
                            <label>
                                Swap for gas is a trusted service allowing you to swap BTC-LN to SOL, so you can then cover the gas fees of a trustless atomiq swap.
                                Note that this is a trusted service and is therefore only used for small amounts! You can read more about it in our <a href="/faq?tabOpen=11" onClick={(e) => {
                                    e.preventDefault();
                                    navigate("/faq?tabOpen=11");
                                }}>FAQ</a>.
                            </label>
                        </Alert>

                        {loading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent">
                                <Spinner animation="border" />
                                Creating gas swap...
                            </div>
                        ) : ""}

                        {swapData!=null ? (
                            <div className="mb-3 tab-accent-p3 text-center">
                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTCLN} className="currency-icon"/>
                                            BTC
                                        </span>
                                    )}
                                    disabled={true}
                                    size={"lg"}
                                    value={swapData.getInput().amount}
                                    onChange={() => {}}
                                    placeholder={"Input amount"}
                                />

                                <Icon size={24} icon={ic_south} className="my-1"/>

                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={nativeCurrency} className="currency-icon"/>
                                            {nativeCurrency.ticker}
                                        </span>
                                    )}
                                    disabled={true}
                                    size={"lg"}
                                    value={swapData.getOutput().amount}
                                    onChange={() => {}}
                                    placeholder={"Output amount"}
                                />
                            </div>
                        ) : ""}

                        {quoteTimeRemaining===0 || success ? "" : (
                            <div className="mb-3 tab-accent">
                                {lnWallet!=null ? (
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
                                            <small className="mt-2"><a href="#" onClick={(e) => {
                                                e.preventDefault();
                                                setLnWallet(null)
                                            }}>Or use a QR code/LN invoice</a></small>
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
                                                value={swapData.getQrData()}
                                                size={300}
                                                includeMargin={true}
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    copy(2);
                                                }}
                                            />
                                        </div>
                                        <label>Please pay this lightning network invoice</label>
                                        <ValidatedInput
                                            type={"text"}
                                            value={swapData.getLightningInvoice()}
                                            textEnd={(
                                                <a href="#" ref={copyBtnRef} onClick={(e) => {
                                                    e.preventDefault();
                                                    copy(1);
                                                }}>
                                                    <Icon icon={clipboard}/>
                                                </a>
                                            )}
                                            inputRef={textFieldRef}
                                        />

                                        <div className="d-flex justify-content-center mt-2">
                                            <Button variant="light" className="d-flex flex-row align-items-center justify-content-center" onClick={() => {
                                                window.location.href = swapData.getQrData();
                                            }}>
                                                <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in Lightning wallet app
                                            </Button>
                                        </div>

                                        <small className="mt-2"><WebLNAnchor/></small>
                                    </>
                                )}
                            </div>
                        )}

                        <div className={!success && !loading ? "d-flex flex-column tab-accent" : "d-none"}>
                            {quoteTimeRemaining===0 ? (
                                <label>Gas swap expired!</label>
                            ) : (
                                <label>Gas swap expires in {quoteTimeRemaining} seconds</label>
                            )}
                            <ProgressBar animated now={quoteTimeRemaining} max={initialQuoteTimeout} min={0}/>
                        </div>
                        {quoteTimeRemaining===0 && !loading && !success ? (
                            <Button onClick={createSwap} variant="secondary" className="mt-3">
                                New gas swap
                            </Button>
                        ) : ""}
                        {success && state?.returnPath!=null ? (
                            <Button onClick={() => {
                                navigate(state.returnPath);
                            }} variant="primary" className="mt-3">
                                Continue
                            </Button>
                        ) : ""}
                    </div>
                </div>
            </div>
        </>
    )
}