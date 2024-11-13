import ValidatedInput, {ValidatedInputRef} from "../../components/ValidatedInput";
import {CurrencyDropdown} from "../../components/CurrencyDropdown";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {FeeSummaryScreen} from "../../components/fees/FeeSummaryScreen";
import {Alert, Badge, Button, Form, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {
    AbstractSigner,
    ISwap,
    LNURLPay,
    LNURLWithdraw,
    MultichainSwapBounds,
    MultichainSwapper,
    SCToken,
    SwapType,
    Tokens
} from "@atomiqlabs/sdk";
import BigNumber from "bignumber.js";
import * as BN from "bn.js";
import {
    fromHumanReadableString,
    smartChainTokenArray,
    toHumanReadable,
    toHumanReadableString
} from "../../utils/Currencies";
import {QuoteSummary} from "../../components/quotes/QuoteSummary";
import {useLocation, useNavigate} from "react-router-dom";
import {SwapTopbar} from "../../components/SwapTopbar";
import {SwapsContext} from "../../context/SwapsContext";
import {TokenIcon} from "../../components/TokenIcon";

const balanceExpiryTime = 30000;

function useCachedBalance(swapper: MultichainSwapper) {
    const balanceCache = useRef<{
        [chainIdentifier: string]: {
            [signer: string]: {
                [tokenAddress: string]: {
                    balance: BN | void,
                    timestamp: number
                }
            }
        }
    }>({});

    const getBalance: (token: SCToken, signer: AbstractSigner) => Promise<BN> = async (token: SCToken, signer: AbstractSigner) => {
        balanceCache.current[token.chainId] ??= {};
        const signerCache = balanceCache.current[token.chainId][signer.getAddress()] ??= {};
        if(
            signerCache[token.address]==null ||
            signerCache[token.address].balance==null ||
            Date.now()-signerCache[token.address].timestamp > balanceExpiryTime
        ) {
            signerCache[token.address] = {
                balance: await swapper.getBalance(token.chainId, signer.getAddress(), token.address).catch(e => console.error(e)),
                timestamp: Date.now()
            };
        }
        return balanceCache.current[token.chainId][signer.getAddress()][token.address].balance as BN;
    };

    return {getBalance};
}

export function QuickScanExecute() {
    const {swapper, getSigner} = useContext(SwapsContext);

    const navigate = useNavigate();

    const {search, state} = useLocation() as {search: string, state: any};
    const params = new URLSearchParams(search);
    const propAddress = params.get("address") || params.get("lightning");

    const stateLnurlParams = state?.lnurlParams!=null ? {
        ...state.lnurlParams,
        min: new BN(state.lnurlParams.min),
        max: new BN(state.lnurlParams.max)
    } : null;

    const [selectedCurrency, setSelectedCurrency] = useState<SCToken>(null);
    const signer = getSigner(selectedCurrency);

    const [lnurlLoading, setLnurlLoading] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<string>(null);
    const [address, setAddress] = useState<string>(null);
    const [isLnurl, setLnurl] = useState<boolean>(false);

    const [amountConstraints, setAmountConstraints] = useState<{
        [chainId: string]: {
            [token: string]: {
                min: BigNumber,
                max: BigNumber
            }
        }
    }>(null);
    const selectedTokenConstraints = amountConstraints==null ?
        null : amountConstraints[selectedCurrency.chainId]==null ?
            null : amountConstraints[selectedCurrency.chainId][selectedCurrency.address]==null ?
                amountConstraints[""][""] : amountConstraints[selectedCurrency.chainId][selectedCurrency.address];
    const selectableCurrencies = amountConstraints==null ?
        smartChainTokenArray :
        smartChainTokenArray.filter(token => amountConstraints[token.chainId]!=null && amountConstraints[token.chainId][token.address]!=null);

    const [amount, setAmount] = useState<string>(null);
    const amountRef = useRef<ValidatedInputRef>();

    const [lnurlParams, setLnurlParams] = useState<LNURLWithdraw | LNURLPay>(null);
    const computedLnurlParams = stateLnurlParams || lnurlParams;
    const [type, setType] = useState<SwapType>(SwapType.TO_BTCLN);
    const isSend = type===SwapType.TO_BTC || type===SwapType.TO_BTCLN;
    const btcToken = type===SwapType.TO_BTC || type===SwapType.FROM_BTC ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;

    const [quoteLoading, setQuoteLoading] = useState<boolean>(null);
    const [quoteError, setQuoteError] = useState<string>(null);
    const [quote, setQuote] = useState<[ISwap, BN]>(null);

    const [isLocked, setLocked] = useState<boolean>(false);

    const {getBalance} = useCachedBalance(swapper);

    useEffect(() => {
        const propToken = params.get("token");
        const propChainId = params.get("chainId");
        console.log("Prop token: ", propToken);
        if(propToken!=null && propChainId!=null) {
            setSelectedCurrency(Tokens[propChainId][propToken]);
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

            const callback = (swapType: SwapType, amount?: BN, min?: BN, max?: BN) => {
                setType(swapType);

                const bounds: MultichainSwapBounds = swapper.getSwapBounds()[swapType];
                let lpsMin: BN;
                let lpsMax: BN;
                for(let chainId in bounds) {
                    const tokenBounds = bounds[chainId];
                    for(let token in bounds) {
                        lpsMin==null ? lpsMin = tokenBounds[token].min : lpsMin = BN.min(lpsMin, tokenBounds[token].min);
                        lpsMax==null ? lpsMax = tokenBounds[token].max : lpsMax = BN.max(lpsMax, tokenBounds[token].max);
                    }
                }

                if(amount!=null) {
                    const amountBN = toHumanReadable(amount, btcToken);
                    if(amount.lt(lpsMin)) {
                        setAddressError("Payment amount ("+amountBN.toString(10)+" BTC) is below minimum swappable amount ("+toHumanReadableString(lpsMin, btcToken)+" BTC)");
                        return;
                    }
                    if(amount.gt(lpsMax)) {
                        setAddressError("Payment amount ("+amountBN.toString(10)+" BTC) is above maximum swappable amount ("+toHumanReadableString(lpsMax, btcToken)+" BTC)");
                        return;
                    }
                    setAmount(amountBN.toString(10));
                }

                if(min!=null && max!=null) {
                    if(min.gt(lpsMax)) {
                        setAddressError("Minimum payable amount ("+toHumanReadableString(min, btcToken)+" BTC) is above maximum swappable amount ("+toHumanReadableString(lpsMax, btcToken)+" BTC)");
                        return;
                    }
                    if(max.lt(lpsMin)) {
                        setAddressError("Maximum payable amount ("+toHumanReadableString(max, btcToken)+" BTC) is below minimum swappable amount ("+toHumanReadableString(lpsMin, btcToken)+" BTC)");
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
                    setAmount(toHumanReadableString(BN.max(min, lpsMin), btcToken));
                }

                const boundsBN: {
                    [chainIds: string]: {
                        [token: string]: {
                            min: BigNumber,
                            max: BigNumber
                        }
                    }
                } = {};
                for(let chainId in bounds) {
                    boundsBN[chainId] = {};
                    const tokenBounds = bounds[chainId];
                    for(let token in bounds) {
                        boundsBN[chainId][token] = {
                            min: toHumanReadable(tokenBounds[token].min, btcToken),
                            max: toHumanReadable(tokenBounds[token].max, btcToken)
                        }
                    }
                }

                boundsBN[""] = {
                    "": {
                        min: toHumanReadable(lpsMin, btcToken),
                        max: toHumanReadable(lpsMax, btcToken)
                    }
                };

                setAmountConstraints(boundsBN);
            }

            if(swapper.isValidBitcoinAddress(resultText)) {
                //On-chain send
                let amountSolBN: BN = null;
                if(_amount!=null) amountSolBN = fromHumanReadableString(_amount, btcToken);
                callback(SwapType.TO_BTC, amountSolBN);
                return;
            }
            if(swapper.isValidLightningInvoice(resultText)) {
                //Lightning send
                const amountSolBN = swapper.getLightningInvoiceValue(resultText);
                callback(SwapType.TO_BTCLN, amountSolBN);
                return;
            }
            if(swapper.isValidLNURL(resultText)) {
                //Check LNURL type
                setLnurlLoading(true);
                setLnurl(true);
                const processLNURL = (result: LNURLWithdraw | LNURLPay, doSetState: boolean) => {
                    console.log(result);
                    setLnurlLoading(false);
                    if(result==null) {
                        setAddressError("Invalid LNURL, cannot process");
                        return;
                    }
                    if(doSetState) setLnurlParams(result);
                    if(result.type==="pay") {
                        callback(SwapType.TO_BTCLN, null, result.min, result.max);
                    }
                    if(result.type==="withdraw") {
                        callback(SwapType.FROM_BTCLN, null, result.min, result.max);
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
        if(amount==null || selectedCurrency==null || signer==null) return;

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

            let swapPromise: Promise<ISwap>;
            if(isSend) {
                if(!btcToken.lightning) {
                    swapPromise = swapper.createToBTCSwap(
                        selectedCurrency.chainId,
                        signer.getAddress(),
                        selectedCurrency.address,
                        address,
                        fromHumanReadableString(amount, btcToken),
                        null,
                        null,
                        null,
                        additionalParam
                    );
                } else {
                    if(isLnurl) {
                        swapPromise = swapper.createToBTCLNSwapViaLNURL(
                            selectedCurrency.chainId,
                            signer.getAddress(),
                            selectedCurrency.address,
                            computedLnurlParams as LNURLPay,
                            fromHumanReadableString(amount, btcToken),
                            "", 5*24*60*60,
                            null,
                            null,
                            null,
                            additionalParam
                        );
                    } else {
                        swapPromise = swapper.createToBTCLNSwap(
                            selectedCurrency.chainId,
                            signer.getAddress(),
                            selectedCurrency.address,
                            address,
                            5*24*60*60,
                            null,
                            null,
                            additionalParam
                        );
                    }
                }
            } else {
                swapPromise = swapper.createFromBTCLNSwapViaLNURL(
                    selectedCurrency.chainId,
                    signer.getAddress(),
                    selectedCurrency.address,
                    computedLnurlParams as LNURLWithdraw,
                    fromHumanReadableString(amount, btcToken),
                    false,
                    additionalParam
                );
            }
            const balancePromise = getBalance(selectedCurrency, signer);
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

    };

    useEffect(() => {
        if(quote!=null) {
            // @ts-ignore
            window.scrollBy(0,99999);
        }
    }, [quote]);

    useEffect(() => {
        getQuote();
    }, [amount, selectedCurrency, signer]);

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
                                <label className="fw-bold mb-1">{isSend ? "Pay" : "Withdraw"}</label>

                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={btcToken} className="currency-icon"/>
                                            BTC
                                        </span>
                                    )}
                                    step={new BigNumber(10).pow(new BigNumber(-btcToken.decimals))}
                                    min={selectedTokenConstraints?.min ?? new BigNumber(0)}
                                    max={selectedTokenConstraints?.max}
                                    disabled={
                                        (amountConstraints!=null && amountConstraints[""][""].min.eq(amountConstraints[""][""].max)) ||
                                        isLocked
                                    }
                                    size={"lg"}
                                    inputRef={amountRef}
                                    value={amount}
                                    onChange={setAmount}
                                    placeholder={"Input amount"}
                                />

                                <label className="fw-bold mb-1">{isSend ? "with" : "to"}</label>

                                <div className="d-flex justify-content-center">
                                    <CurrencyDropdown currencyList={selectableCurrencies} onSelect={val => {
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
                                    <label title="" htmlFor="autoclaim-pay" className="form-check-label me-2">{isSend ? "Auto-pay" : "Auto-claim"}</label>
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