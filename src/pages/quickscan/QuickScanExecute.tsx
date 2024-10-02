import ValidatedInput, {ValidatedInputRef} from "../../components/ValidatedInput";
import {CurrencyDropdown} from "../../components/CurrencyDropdown";
import {useContext, useEffect, useRef, useState} from "react";
import {FeeSummaryScreen} from "../../components/fees/FeeSummaryScreen";
import {Alert, Badge, Button, Form, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {ISwap, LNURLPay, LNURLWithdraw, SolanaSwapper, SwapType, TokenAddress} from "sollightning-sdk";
import BigNumber from "bignumber.js";
import * as BN from "bn.js";
import {
    btcCurrency,
    CurrencySpec,
    fromHumanReadable,
    smartChainCurrencies,
    toHumanReadable
} from "../../utils/Currencies";
import {QuoteSummary} from "../../components/quotes/QuoteSummary";
import {useLocation, useNavigate} from "react-router-dom";
import {SwapTopbar} from "../../components/SwapTopbar";
import * as React from "react";
import {SwapsContext} from "../../context/SwapsContext";

const balanceExpiryTime = 30000;

export function QuickScanExecute() {
    const {swapper} = useContext(SwapsContext);

    const navigate = useNavigate();

    const {search, state} = useLocation() as {search: string, state: any};
    const params = new URLSearchParams(search);
    const propAddress = params.get("address") || params.get("lightning");

    const stateLnurlParams = state?.lnurlParams!=null ? {
        ...state.lnurlParams,
        min: new BN(state.lnurlParams.min),
        max: new BN(state.lnurlParams.max)
    } : null;

    const [selectedCurrency, setSelectedCurrency] = useState<CurrencySpec>(null);

    const [lnurlLoading, setLnurlLoading] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<string>(null);
    const [address, setAddress] = useState<string>(null);
    const [isLnurl, setLnurl] = useState<boolean>(false);

    const [amountConstraints, setAmountConstraints] = useState<{
        [token: string]: {
            min: BigNumber,
            max: BigNumber
        }
    }>(null);
    const [amount, setAmount] = useState<string>(null);
    const amountRef = useRef<ValidatedInputRef>();

    const [lnurlParams, setLnurlParams] = useState<LNURLWithdraw | LNURLPay>(null);
    const computedLnurlParams = stateLnurlParams || lnurlParams;
    const [type, setType] = useState<"send" | "receive">("send");
    const [network, setNetwork] = useState<"ln" | "btc">("ln");

    const [quoteLoading, setQuoteLoading] = useState<boolean>(null);
    const [quoteError, setQuoteError] = useState<string>(null);
    const [quote, setQuote] = useState<[ISwap, BN]>(null);

    const [isLocked, setLocked] = useState<boolean>(false);

    const balanceCache = useRef<{
        [tokenAddress: string]: {
            balance: any | void,
            timestamp: number
        }
    }>({});

    const getBalance: (tokenAddress: TokenAddress) => Promise<BN> = async (tokenAddress: TokenAddress) => {
        if(balanceCache.current[tokenAddress.toString()]==null || balanceCache.current[tokenAddress.toString()].balance==null || Date.now()-balanceCache.current[tokenAddress.toString()].timestamp>balanceExpiryTime) {
            balanceCache.current[tokenAddress.toString()] = {
                balance: await swapper.getBalance(tokenAddress).catch(e => console.error(e)),
                timestamp: Date.now()
            };
        }
        return balanceCache.current[tokenAddress.toString()].balance as BN;
    };

    useEffect(() => {
        const propToken = params.get("token");
        console.log("Prop token: ", propToken);
        if(propToken!=null) {
            setSelectedCurrency(smartChainCurrencies.find(token => token.ticker===propToken));
        }
    }, []);

    const [autoContinue, setAutoContinue] = useState<boolean>();

    useEffect(() => {

        const config = window.localStorage.getItem("crossLightning-autoContinue");

        setAutoContinue(config==null ? true : config==="true");

    }, []);

    const setAndSaveAutoContinue = (value: boolean) => {
        setAutoContinue(value);
        window.localStorage.setItem("crossLightning-autoContinue", ""+value);
    };

    useEffect(() => {
        console.log("Prop address: ", propAddress);

        if(propAddress==null) {
            navigate("/scan");
            return;
        }

        if(swapper!=null) {

            let lightning: boolean = false;
            let resultText: string = propAddress;
            if(resultText.startsWith("lightning:")) {
                resultText = resultText.substring(10);
            }
            let _amount: string = null;
            if(resultText.startsWith("bitcoin:")) {
                resultText = resultText.substring(8);
                if(resultText.includes("?")) {
                    const arr = resultText.split("?");
                    resultText = arr[0];
                    const params = arr[1].split("&");
                    for(let param of params) {
                        const arr2 = param.split("=");
                        const key = arr2[0];
                        const value = decodeURIComponent(arr2[1]);
                        if(key==="amount") {
                            _amount = value;
                        }
                    }
                }
            }

            setAmountConstraints(null);
            setLnurlLoading(false);
            setAddressError(null);
            setLnurl(false);
            setAddress(resultText);

            const callback = (type: "send" | "receive", network: "btc" | "ln", swapType: SwapType, amount?: BN, min?: BN, max?: BN) => {
                setType(type);
                setNetwork(network);

                const bounds = swapper.getSwapBounds()[swapType];
                let lpsMin: BN;
                let lpsMax: BN;
                for(let token in bounds) {
                    lpsMin==null ? lpsMin = bounds[token].min : lpsMin = BN.min(lpsMin, bounds[token].min);
                    lpsMax==null ? lpsMax = bounds[token].max : lpsMax = BN.max(lpsMax, bounds[token].max);
                }

                if(amount!=null) {
                    const amountBN = toHumanReadable(amount, btcCurrency);
                    if(amount.lt(lpsMin)) {
                        setAddressError("Payment amount ("+amountBN.toString(10)+" BTC) is below minimum swappable amount ("+toHumanReadable(lpsMin, btcCurrency).toString(10)+" BTC)");
                        return;
                    }
                    if(amount.gt(lpsMax)) {
                        setAddressError("Payment amount ("+amountBN.toString(10)+" BTC) is above maximum swappable amount ("+toHumanReadable(lpsMax, btcCurrency).toString(10)+" BTC)");
                        return;
                    }
                    setAmount(amountBN.toString(10));
                }

                if(min!=null && max!=null) {
                    if(min.gt(lpsMax)) {
                        setAddressError("Minimum payable amount ("+toHumanReadable(min, btcCurrency).toString(10)+" BTC) is above maximum swappable amount ("+toHumanReadable(lpsMax, btcCurrency).toString(10)+" BTC)");
                        return;
                    }
                    if(max.lt(lpsMin)) {
                        setAddressError("Maximum payable amount ("+toHumanReadable(max, btcCurrency).toString(10)+" BTC) is below minimum swappable amount ("+toHumanReadable(lpsMin, btcCurrency).toString(10)+" BTC)");
                        return;
                    }
                    for(let token in bounds) {
                        if(
                            min.gt(bounds[token].max) ||
                            max.lt(bounds[token].min)
                        ) {
                            delete bounds[token];
                            continue;
                        }
                        bounds[token].min = BN.max(min, bounds[token].min);
                        bounds[token].max = BN.min(max, bounds[token].max);
                    }
                    setAmount(toHumanReadable(BN.max(min, lpsMin), btcCurrency).toString(10));
                }

                const boundsBN: {
                    [token: string]: {
                        min: BigNumber,
                        max: BigNumber
                    }
                } = {};
                for(let token in bounds) {
                    boundsBN[token] = {
                        min: toHumanReadable(bounds[token].min, btcCurrency),
                        max: toHumanReadable(bounds[token].max, btcCurrency)
                    }
                }

                boundsBN[""] = {
                    min: toHumanReadable(lpsMin, btcCurrency),
                    max: toHumanReadable(lpsMax, btcCurrency)
                }

                setAmountConstraints(boundsBN);
            }

            if(swapper.isValidBitcoinAddress(resultText)) {
                //On-chain send
                let amountSolBN: BN = null;
                if(_amount!=null) amountSolBN = fromHumanReadable(new BigNumber(_amount), btcCurrency);
                callback("send", "btc", SwapType.TO_BTC, amountSolBN);
                return;
            }
            if(swapper.isValidLightningInvoice(resultText)) {
                //Lightning send
                const amountSolBN = swapper.getLightningInvoiceValue(resultText);
                callback("send", "ln", SwapType.TO_BTCLN, amountSolBN);
                return;
            }
            if(swapper.isValidLNURL(resultText)) {
                //Check LNURL type
                setLnurlLoading(true);
                setLnurl(true);
                setNetwork("ln");
                const processLNURL = (result: LNURLWithdraw | LNURLPay, doSetState: boolean) => {
                    console.log(result);
                    setLnurlLoading(false);
                    if(result==null) {
                        setAddressError("Invalid LNURL, cannot process");
                        return;
                    }
                    if(doSetState) setLnurlParams(result);
                    if(result.type==="pay") {
                        callback("send", "ln", SwapType.TO_BTCLN, null, result.min, result.max);
                    }
                    if(result.type==="withdraw") {
                        callback("receive", "ln", SwapType.FROM_BTCLN, null, result.min, result.max);
                    }
                };
                if(stateLnurlParams!=null) {
                    console.log("LNurl params passed: ", stateLnurlParams);
                    processLNURL(stateLnurlParams, false);
                    return;
                }
                swapper.getLNURLTypeAndData(resultText).then(resp => processLNURL(resp, true)).catch((e) => {
                    setLnurlLoading(false);
                    setAddressError("Failed to contact LNURL service, check you internet connection and retry later.");
                });
                return;
            }
            try {
                if(swapper.getLightningInvoiceValue(resultText)==null) {
                    setAddressError("Lightning invoice needs to contain a payment amount!");
                    return;
                }
            } catch (e) {}
            setAddressError("Invalid address, lightning invoice or LNURL!");
        }
    }, [propAddress, swapper]);

    const quoteUpdates = useRef<number>(0);
    const currentQuotation = useRef<Promise<any>>(Promise.resolve());

    const getQuote = () => {
        if(amount!=null && selectedCurrency!=null) {
            setQuote(null);
            setQuoteError(null);
            quoteUpdates.current++;
            const updateNum = quoteUpdates.current;
            if(!amountRef.current.validate()) return;
            const process = () => {
                if(quoteUpdates.current!==updateNum) {
                    return;
                }
                setQuoteLoading(true);

                let additionalParam: Record<string, any>;
                const affiliate = window.localStorage.getItem("atomiq-affiliate");
                if(affiliate!=null) {
                    additionalParam = {
                        affiliate
                    };
                }

                let swapPromise;
                if(type==="send") {
                    if(network==="btc") {
                        swapPromise = swapper.createToBTCSwap(selectedCurrency.address, address, fromHumanReadable(new BigNumber(amount), btcCurrency), null, null, null, additionalParam);
                    }
                    if(network==="ln") {
                        if(isLnurl) {
                            swapPromise = swapper.createToBTCLNSwapViaLNURL(selectedCurrency.address, computedLnurlParams as LNURLPay, fromHumanReadable(new BigNumber(amount), btcCurrency), "", 5*24*60*60, null, null, null, additionalParam);
                        } else {
                            swapPromise = swapper.createToBTCLNSwap(selectedCurrency.address, address, 5*24*60*60, null, null, additionalParam);
                        }
                    }
                } else {
                    swapPromise = swapper.createFromBTCLNSwapViaLNURL(selectedCurrency.address, computedLnurlParams as LNURLWithdraw, fromHumanReadable(new BigNumber(amount), btcCurrency), false, additionalParam);
                }
                const balancePromise = getBalance(selectedCurrency.address);
                currentQuotation.current = Promise.all([swapPromise, balancePromise]).then((swapAndBalance) => {
                    if(quoteUpdates.current!==updateNum) {
                        return;
                    }
                    setQuoteLoading(false);
                    setQuote(swapAndBalance);
                }).catch(e => {
                    if(quoteUpdates.current!==updateNum) {
                        return;
                    }
                    setQuoteLoading(false);
                    setQuoteError(e.toString());
                });
            };
            currentQuotation.current.then(process, process);
        }
    };

    useEffect(() => {
        if(quote!=null) {
            // @ts-ignore
            window.scrollBy(0,99999);
        }
    }, [quote]);

    useEffect(() => {
        getQuote();
    }, [amount, selectedCurrency]);

    const goBack = () => {
        navigate("/scan");
    };

    return (
        <>
            <SwapTopbar selected={1} enabled={!isLocked}/>

            <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
                <div className="quickscan-summary-panel d-flex flex-column flex-fill">
                    <div className="p-3 d-flex flex-column tab-bg border-0 card">
                        <ValidatedInput
                            type={"text"}
                            className=""
                            disabled={true}
                            value={address || propAddress}
                        />

                        {addressError ? (
                            <Alert variant={"danger"} className="mt-3">
                                <p><strong>Destination parsing error</strong></p>
                                {addressError}
                            </Alert>
                        ) : ""}

                        {lnurlLoading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                                <Spinner animation="border" />
                                Loading data...
                            </div>
                        ) : ""}

                        {addressError==null && swapper!=null && !lnurlLoading ? (
                            <div className="mt-3 tab-accent-p3 text-center">
                                <label className="fw-bold mb-1">{type==="send" ? "Pay" : "Withdraw"}</label>

                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <img src={btcCurrency.icon} className="currency-icon"/>
                                            BTC
                                        </span>
                                    )}
                                    step={new BigNumber(10).pow(new BigNumber(-btcCurrency.decimals))}
                                    min={amountConstraints==null ? new BigNumber(0) : amountConstraints[selectedCurrency?.address?.toString() || ""].min}
                                    max={amountConstraints==null ? null : amountConstraints[selectedCurrency?.address?.toString() || ""].max}
                                    disabled={
                                        (amountConstraints!=null && amountConstraints[""].min.eq(amountConstraints[""].max)) ||
                                        isLocked
                                    }
                                    size={"lg"}
                                    inputRef={amountRef}
                                    value={amount}
                                    onChange={setAmount}
                                    placeholder={"Input amount"}
                                />

                                <label className="fw-bold mb-1">{type==="send" ? "with" : "to"}</label>

                                <div className="d-flex justify-content-center">
                                    <CurrencyDropdown currencyList={amountConstraints==null ? smartChainCurrencies : smartChainCurrencies.filter(currency => amountConstraints[currency.address.toString()]!=null)} onSelect={val => {
                                        if(isLocked) return;
                                        setSelectedCurrency(val);
                                    }} value={selectedCurrency} className="bg-black bg-opacity-10 text-white"/>
                                </div>

                                <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-2">
                                    <Form.Check // prettier-ignore
                                        id="autoclaim-pay"
                                        type="switch"
                                        onChange={(val) => setAndSaveAutoContinue(val.target.checked)}
                                        checked={autoContinue}
                                    />
                                    <label title="" htmlFor="autoclaim-pay" className="form-check-label me-2">{type==="send" ? "Auto-pay" : "Auto-claim"}</label>
                                    <OverlayTrigger overlay={<Tooltip id="autoclaim-pay-tooltip">
                                        Automatically requests authorization of the transaction through your wallet - as soon as the swap pricing is returned.
                                    </Tooltip>}>
                                        <Badge bg="primary" className="pill-round" pill>?</Badge>
                                    </OverlayTrigger>
                                </Form>
                            </div>
                        ) : ""}

                        {quoteLoading? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                                <Spinner animation="border" />
                                Fetching quote...
                            </div>
                        ) : ""}

                        {quoteError ? (
                            <Alert variant={"danger"} className="mt-3">
                                <p><strong>Quoting error</strong></p>
                                {quoteError}
                            </Alert>
                        ) : ""}

                        {quoteError || addressError ? (
                            <Button variant="secondary" onClick={goBack} className="mt-3">
                                Back
                            </Button>
                        ) : ""}

                        {quote!=null ? (
                            <>
                                <FeeSummaryScreen swap={quote[0]} className="mt-3 mb-3 tab-accent"/>
                                <QuoteSummary setAmountLock={setLocked} type={"payment"} quote={quote[0]} balance={quote[1]} refreshQuote={getQuote} autoContinue={autoContinue}/>
                            </>
                        ) : ""}
                    </div>
                    <div className="d-flex mt-auto py-4">
                        <Button variant="secondary flex-fill" disabled={isLocked} onClick={goBack}>
                            &lt; Back
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}