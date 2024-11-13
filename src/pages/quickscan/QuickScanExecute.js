import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import ValidatedInput from "../../components/ValidatedInput";
import { CurrencyDropdown } from "../../components/CurrencyDropdown";
import { useContext, useEffect, useRef, useState } from "react";
import { FeeSummaryScreen } from "../../components/fees/FeeSummaryScreen";
import { Alert, Badge, Button, Form, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { SwapType, Tokens } from "@atomiqlabs/sdk";
import BigNumber from "bignumber.js";
import * as BN from "bn.js";
import { fromHumanReadableString, smartChainTokenArray, toHumanReadable, toHumanReadableString } from "../../utils/Currencies";
import { QuoteSummary } from "../../components/quotes/QuoteSummary";
import { useLocation, useNavigate } from "react-router-dom";
import { SwapTopbar } from "../../components/SwapTopbar";
import { SwapsContext } from "../../context/SwapsContext";
import { TokenIcon } from "../../components/TokenIcon";
const balanceExpiryTime = 30000;
function useCachedBalance(swapper) {
    const balanceCache = useRef({});
    const getBalance = async (token, signer) => {
        var _a, _b, _c, _d;
        (_a = balanceCache.current)[_b = token.chainId] ?? (_a[_b] = {});
        const signerCache = (_c = balanceCache.current[token.chainId])[_d = signer.getAddress()] ?? (_c[_d] = {});
        if (signerCache[token.address] == null ||
            signerCache[token.address].balance == null ||
            Date.now() - signerCache[token.address].timestamp > balanceExpiryTime) {
            signerCache[token.address] = {
                balance: await swapper.getBalance(token.chainId, signer.getAddress(), token.address).catch(e => console.error(e)),
                timestamp: Date.now()
            };
        }
        return balanceCache.current[token.chainId][signer.getAddress()][token.address].balance;
    };
    return { getBalance };
}
export function QuickScanExecute() {
    const { swapper, getSigner } = useContext(SwapsContext);
    const navigate = useNavigate();
    const { search, state } = useLocation();
    const params = new URLSearchParams(search);
    const propAddress = params.get("address") || params.get("lightning");
    const stateLnurlParams = state?.lnurlParams != null ? {
        ...state.lnurlParams,
        min: new BN(state.lnurlParams.min),
        max: new BN(state.lnurlParams.max)
    } : null;
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const signer = getSigner(selectedCurrency);
    const [lnurlLoading, setLnurlLoading] = useState(false);
    const [addressError, setAddressError] = useState(null);
    const [address, setAddress] = useState(null);
    const [isLnurl, setLnurl] = useState(false);
    const [amountConstraints, setAmountConstraints] = useState(null);
    const selectedTokenConstraints = amountConstraints == null ?
        null : amountConstraints[selectedCurrency.chainId] == null ?
        null : amountConstraints[selectedCurrency.chainId][selectedCurrency.address] == null ?
        amountConstraints[""][""] : amountConstraints[selectedCurrency.chainId][selectedCurrency.address];
    const selectableCurrencies = amountConstraints == null ?
        smartChainTokenArray :
        smartChainTokenArray.filter(token => amountConstraints[token.chainId] != null && amountConstraints[token.chainId][token.address] != null);
    const [amount, setAmount] = useState(null);
    const amountRef = useRef();
    const [lnurlParams, setLnurlParams] = useState(null);
    const computedLnurlParams = stateLnurlParams || lnurlParams;
    const [type, setType] = useState(SwapType.TO_BTCLN);
    const isSend = type === SwapType.TO_BTC || type === SwapType.TO_BTCLN;
    const btcToken = type === SwapType.TO_BTC || type === SwapType.FROM_BTC ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
    const [quoteLoading, setQuoteLoading] = useState(null);
    const [quoteError, setQuoteError] = useState(null);
    const [quote, setQuote] = useState(null);
    const [isLocked, setLocked] = useState(false);
    const { getBalance } = useCachedBalance(swapper);
    useEffect(() => {
        const propToken = params.get("token");
        const propChainId = params.get("chainId");
        console.log("Prop token: ", propToken);
        if (propToken != null && propChainId != null) {
            setSelectedCurrency(Tokens[propChainId][propToken]);
        }
    }, []);
    const [autoContinue, setAutoContinue] = useState();
    useEffect(() => {
        const config = window.localStorage.getItem("crossLightning-autoContinue");
        setAutoContinue(config == null ? true : config === "true");
    }, []);
    const setAndSaveAutoContinue = (value) => {
        setAutoContinue(value);
        window.localStorage.setItem("crossLightning-autoContinue", "" + value);
    };
    useEffect(() => {
        console.log("Prop address: ", propAddress);
        if (propAddress == null) {
            navigate("/scan");
            return;
        }
        if (swapper != null) {
            let resultText = propAddress;
            if (resultText.startsWith("lightning:")) {
                resultText = resultText.substring(10);
            }
            let _amount = null;
            if (resultText.startsWith("bitcoin:")) {
                resultText = resultText.substring(8);
                if (resultText.includes("?")) {
                    const arr = resultText.split("?");
                    resultText = arr[0];
                    const params = arr[1].split("&");
                    for (let param of params) {
                        const arr2 = param.split("=");
                        const key = arr2[0];
                        const value = decodeURIComponent(arr2[1]);
                        if (key === "amount") {
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
            const callback = (swapType, amount, min, max) => {
                setType(swapType);
                const bounds = swapper.getSwapBounds()[swapType];
                let lpsMin;
                let lpsMax;
                for (let chainId in bounds) {
                    const tokenBounds = bounds[chainId];
                    for (let token in bounds) {
                        lpsMin == null ? lpsMin = tokenBounds[token].min : lpsMin = BN.min(lpsMin, tokenBounds[token].min);
                        lpsMax == null ? lpsMax = tokenBounds[token].max : lpsMax = BN.max(lpsMax, tokenBounds[token].max);
                    }
                }
                if (amount != null) {
                    const amountBN = toHumanReadable(amount, btcToken);
                    if (amount.lt(lpsMin)) {
                        setAddressError("Payment amount (" + amountBN.toString(10) + " BTC) is below minimum swappable amount (" + toHumanReadableString(lpsMin, btcToken) + " BTC)");
                        return;
                    }
                    if (amount.gt(lpsMax)) {
                        setAddressError("Payment amount (" + amountBN.toString(10) + " BTC) is above maximum swappable amount (" + toHumanReadableString(lpsMax, btcToken) + " BTC)");
                        return;
                    }
                    setAmount(amountBN.toString(10));
                }
                if (min != null && max != null) {
                    if (min.gt(lpsMax)) {
                        setAddressError("Minimum payable amount (" + toHumanReadableString(min, btcToken) + " BTC) is above maximum swappable amount (" + toHumanReadableString(lpsMax, btcToken) + " BTC)");
                        return;
                    }
                    if (max.lt(lpsMin)) {
                        setAddressError("Maximum payable amount (" + toHumanReadableString(max, btcToken) + " BTC) is below minimum swappable amount (" + toHumanReadableString(lpsMin, btcToken) + " BTC)");
                        return;
                    }
                    for (let token in bounds) {
                        if (min.gt(bounds[token].max) ||
                            max.lt(bounds[token].min)) {
                            delete bounds[token];
                            continue;
                        }
                        bounds[token].min = BN.max(min, bounds[token].min);
                        bounds[token].max = BN.min(max, bounds[token].max);
                    }
                    setAmount(toHumanReadableString(BN.max(min, lpsMin), btcToken));
                }
                const boundsBN = {};
                for (let chainId in bounds) {
                    boundsBN[chainId] = {};
                    const tokenBounds = bounds[chainId];
                    for (let token in bounds) {
                        boundsBN[chainId][token] = {
                            min: toHumanReadable(tokenBounds[token].min, btcToken),
                            max: toHumanReadable(tokenBounds[token].max, btcToken)
                        };
                    }
                }
                boundsBN[""] = {
                    "": {
                        min: toHumanReadable(lpsMin, btcToken),
                        max: toHumanReadable(lpsMax, btcToken)
                    }
                };
                setAmountConstraints(boundsBN);
            };
            if (swapper.isValidBitcoinAddress(resultText)) {
                //On-chain send
                let amountSolBN = null;
                if (_amount != null)
                    amountSolBN = fromHumanReadableString(_amount, btcToken);
                callback(SwapType.TO_BTC, amountSolBN);
                return;
            }
            if (swapper.isValidLightningInvoice(resultText)) {
                //Lightning send
                const amountSolBN = swapper.getLightningInvoiceValue(resultText);
                callback(SwapType.TO_BTCLN, amountSolBN);
                return;
            }
            if (swapper.isValidLNURL(resultText)) {
                //Check LNURL type
                setLnurlLoading(true);
                setLnurl(true);
                const processLNURL = (result, doSetState) => {
                    console.log(result);
                    setLnurlLoading(false);
                    if (result == null) {
                        setAddressError("Invalid LNURL, cannot process");
                        return;
                    }
                    if (doSetState)
                        setLnurlParams(result);
                    if (result.type === "pay") {
                        callback(SwapType.TO_BTCLN, null, result.min, result.max);
                    }
                    if (result.type === "withdraw") {
                        callback(SwapType.FROM_BTCLN, null, result.min, result.max);
                    }
                };
                if (stateLnurlParams != null) {
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
                if (swapper.getLightningInvoiceValue(resultText) == null) {
                    setAddressError("Lightning invoice needs to contain a payment amount!");
                    return;
                }
            }
            catch (e) { }
            setAddressError("Invalid address, lightning invoice or LNURL!");
        }
    }, [propAddress, swapper]);
    const quoteUpdates = useRef(0);
    const currentQuotation = useRef(Promise.resolve());
    const getQuote = () => {
        if (amount == null || selectedCurrency == null || signer == null)
            return;
        setQuote(null);
        setQuoteError(null);
        quoteUpdates.current++;
        const updateNum = quoteUpdates.current;
        if (!amountRef.current.validate())
            return;
        const process = () => {
            if (quoteUpdates.current !== updateNum) {
                return;
            }
            setQuoteLoading(true);
            let additionalParam;
            const affiliate = window.localStorage.getItem("atomiq-affiliate");
            if (affiliate != null) {
                additionalParam = {
                    affiliate
                };
            }
            let swapPromise;
            if (isSend) {
                if (!btcToken.lightning) {
                    swapPromise = swapper.createToBTCSwap(selectedCurrency.chainId, signer.getAddress(), selectedCurrency.address, address, fromHumanReadableString(amount, btcToken), null, null, null, additionalParam);
                }
                else {
                    if (isLnurl) {
                        swapPromise = swapper.createToBTCLNSwapViaLNURL(selectedCurrency.chainId, signer.getAddress(), selectedCurrency.address, computedLnurlParams, fromHumanReadableString(amount, btcToken), "", 5 * 24 * 60 * 60, null, null, null, additionalParam);
                    }
                    else {
                        swapPromise = swapper.createToBTCLNSwap(selectedCurrency.chainId, signer.getAddress(), selectedCurrency.address, address, 5 * 24 * 60 * 60, null, null, additionalParam);
                    }
                }
            }
            else {
                swapPromise = swapper.createFromBTCLNSwapViaLNURL(selectedCurrency.chainId, signer.getAddress(), selectedCurrency.address, computedLnurlParams, fromHumanReadableString(amount, btcToken), false, additionalParam);
            }
            const balancePromise = getBalance(selectedCurrency, signer);
            currentQuotation.current = Promise.all([swapPromise, balancePromise]).then((swapAndBalance) => {
                if (quoteUpdates.current !== updateNum) {
                    return;
                }
                setQuoteLoading(false);
                setQuote(swapAndBalance);
            }).catch(e => {
                if (quoteUpdates.current !== updateNum) {
                    return;
                }
                setQuoteLoading(false);
                setQuoteError(e.toString());
            });
        };
        currentQuotation.current.then(process, process);
    };
    useEffect(() => {
        if (quote != null) {
            // @ts-ignore
            window.scrollBy(0, 99999);
        }
    }, [quote]);
    useEffect(() => {
        getQuote();
    }, [amount, selectedCurrency, signer]);
    const goBack = () => {
        navigate("/scan");
    };
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 1, enabled: !isLocked }), _jsx("div", { className: "d-flex flex-column flex-fill justify-content-center align-items-center text-white", children: _jsxs("div", { className: "quickscan-summary-panel d-flex flex-column flex-fill", children: [_jsxs("div", { className: "p-3 d-flex flex-column tab-bg border-0 card", children: [_jsx(ValidatedInput, { type: "text", className: "", disabled: true, value: address || propAddress }), addressError ? (_jsxs(Alert, { variant: "danger", className: "mt-3", children: [_jsx("p", { children: _jsx("strong", { children: "Destination parsing error" }) }), addressError] })) : "", lnurlLoading ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center tab-accent mt-3", children: [_jsx(Spinner, { animation: "border" }), "Loading data..."] })) : "", addressError == null && swapper != null && !lnurlLoading ? (_jsxs("div", { className: "mt-3 tab-accent-p3 text-center", children: [_jsx("label", { className: "fw-bold mb-1", children: isSend ? "Pay" : "Withdraw" }), _jsx(ValidatedInput, { type: "number", textEnd: (_jsxs("span", { className: "text-white font-bigger d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: btcToken, className: "currency-icon" }), "BTC"] })), step: new BigNumber(10).pow(new BigNumber(-btcToken.decimals)), min: selectedTokenConstraints?.min ?? new BigNumber(0), max: selectedTokenConstraints?.max, disabled: (amountConstraints != null && amountConstraints[""][""].min.eq(amountConstraints[""][""].max)) ||
                                                isLocked, size: "lg", inputRef: amountRef, value: amount, onChange: setAmount, placeholder: "Input amount" }), _jsx("label", { className: "fw-bold mb-1", children: isSend ? "with" : "to" }), _jsx("div", { className: "d-flex justify-content-center", children: _jsx(CurrencyDropdown, { currencyList: selectableCurrencies, onSelect: val => {
                                                    if (isLocked)
                                                        return;
                                                    setSelectedCurrency(val);
                                                }, value: selectedCurrency, className: "bg-black bg-opacity-10 text-white" }) }), _jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-2", children: [_jsx(Form.Check // prettier-ignore
                                                , { id: "autoclaim-pay", type: "switch", onChange: (val) => setAndSaveAutoContinue(val.target.checked), checked: autoContinue }), _jsx("label", { title: "", htmlFor: "autoclaim-pay", className: "form-check-label me-2", children: isSend ? "Auto-pay" : "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the transaction through your wallet - as soon as the swap pricing is returned." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })] })) : "", quoteLoading ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center tab-accent mt-3", children: [_jsx(Spinner, { animation: "border" }), "Fetching quote..."] })) : "", quoteError ? (_jsxs(Alert, { variant: "danger", className: "mt-3", children: [_jsx("p", { children: _jsx("strong", { children: "Quoting error" }) }), quoteError] })) : "", quoteError || addressError ? (_jsx(Button, { variant: "secondary", onClick: goBack, className: "mt-3", children: "Back" })) : "", quote != null ? (_jsxs(_Fragment, { children: [_jsx(FeeSummaryScreen, { swap: quote[0], className: "mt-3 mb-3 tab-accent" }), _jsx(QuoteSummary, { setAmountLock: setLocked, type: "payment", quote: quote[0], balance: quote[1], refreshQuote: getQuote, autoContinue: autoContinue })] })) : ""] }), _jsx("div", { className: "d-flex mt-auto py-4", children: _jsx(Button, { variant: "secondary flex-fill", disabled: isLocked, onClick: goBack, children: "< Back" }) })] }) })] }));
}
