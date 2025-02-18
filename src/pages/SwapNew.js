import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BitcoinNetwork, isBtcToken, isSCToken, SwapType } from "@atomiqlabs/sdk";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useAddressData } from "../utils/useAddressData";
import ValidatedInput from "../components/ValidatedInput";
import { useAmountConstraints } from "../utils/useAmountConstraints";
import { useWalletBalance } from "../utils/useWalletBalance";
import { useBigNumberState } from "../utils/useBigNumberState";
import { SwapTopbar } from "../components/SwapTopbar";
import { QRScannerModal } from "../components/qr/QRScannerModal";
import { Alert, Button, Card, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { bitcoinTokenArray, fromHumanReadable, smartChainTokenArray } from "../utils/Currencies";
import { FEConstants, Tokens } from "../FEConstants";
import BigNumber from "bignumber.js";
import { CurrencyDropdown } from "../components/CurrencyDropdown";
import { SimpleFeeSummaryScreen } from "../components/fees/SimpleFeeScreen";
import { QuoteSummary } from "../components/quotes/QuoteSummary";
import { ErrorAlert } from "../components/ErrorAlert";
import { useQuote } from "../utils/useQuote";
import { usePricing } from "../utils/usePricing";
import { BitcoinWalletContext } from "../context/BitcoinWalletProvider";
import { WebLNContext } from "../context/WebLNContext";
import * as bitcoin from "bitcoinjs-lib";
import * as randomBytes from "randombytes";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "react-icons-kit";
import { arrows_vertical } from 'react-icons-kit/ikons/arrows_vertical';
import { ic_qr_code_scanner } from 'react-icons-kit/md/ic_qr_code_scanner';
import { lock } from 'react-icons-kit/fa/lock';
import { ic_power_off_outline } from 'react-icons-kit/md/ic_power_off_outline';
import { useExistingSwap } from "../utils/useExistingSwap";
import { ConnectedWalletAnchor } from "../components/wallet/ConnectedWalletAnchor";
const RANDOM_BTC_ADDRESS = bitcoin.payments.p2wsh({
    hash: randomBytes(32),
    network: FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
}).address;
export function SwapNew(props) {
    const navigate = useNavigate();
    const { swapper, chains } = useContext(SwapsContext);
    const { bitcoinWallet, disconnect } = useContext(BitcoinWalletContext);
    const { lnWallet } = useContext(WebLNContext);
    //Existing swap quote
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get("swapId");
    const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
    const [isUnlocked, setUnlocked] = useState(false);
    const locked = !isUnlocked && existingSwap != null;
    //Tokens
    const [_swapType, setSwapType] = useState(SwapType.FROM_BTC);
    const [_scCurrency, setScCurrency] = useState(smartChainTokenArray[0]);
    const swapType = existingSwap != null ? existingSwap.getType() : _swapType;
    const isSend = swapType === SwapType.TO_BTCLN || swapType === SwapType.TO_BTC;
    const scCurrency = existingSwap != null ? (isSend ? existingSwap.getInput() : existingSwap.getOutput()).token : _scCurrency;
    const inputToken = useMemo(() => swapType === SwapType.FROM_BTCLN ? Tokens.BITCOIN.BTCLN : swapType === SwapType.FROM_BTC ? Tokens.BITCOIN.BTC : scCurrency, [swapType, scCurrency]);
    const outputToken = useMemo(() => swapType === SwapType.TO_BTCLN ? Tokens.BITCOIN.BTCLN : swapType === SwapType.TO_BTC ? Tokens.BITCOIN.BTC : scCurrency, [swapType, scCurrency]);
    const signerData = scCurrency == null ? null : chains[scCurrency.chainId];
    //Address
    const addressRef = useRef();
    const addressValidator = useCallback((val) => {
        if (val === "")
            return "Destination address/lightning invoice required";
        if (val.startsWith("lightning:")) {
            val = val.substring(10);
        }
        if (val.startsWith("bitcoin:")) {
            val = val.substring(8);
            if (val.includes("?")) {
                val = val.split("?")[0];
            }
        }
        if (swapper.isValidLNURL(val) || swapper.isValidBitcoinAddress(val) || swapper.isValidLightningInvoice(val))
            return null;
        try {
            if (swapper.getLightningInvoiceValue(val) == null)
                return "Lightning invoice needs to contain a payment amount!";
        }
        catch (e) { }
        return "Invalid bitcoin address/lightning network invoice";
    }, [swapper]);
    const [_validatedAddress, setValidatedAddress] = useState(null);
    const validatedAddress = existingSwap != null ? null : (swapType === SwapType.TO_BTC && bitcoinWallet != null) ? bitcoinWallet.getReceiveAddress() : _validatedAddress;
    const [addressLoading, addressData] = useAddressData(validatedAddress);
    useEffect(() => {
        if (addressData?.swapType != null) {
            console.log("SwapNew: useEffect(addressData.swapType): Setting swap type: " + SwapType[addressData.swapType]);
            setSwapType(addressData.swapType);
        }
    }, [addressData?.swapType]);
    useEffect(() => {
        if (addressData?.lnurlResult == null)
            return;
        if (addressData.lnurlResult.type === "withdraw") {
            navigate("/scan/2?address=" + encodeURIComponent(addressData.address) + (scCurrency == null ? "" : "&token=" + encodeURIComponent(scCurrency.ticker)
                + "&chainId=" + encodeURIComponent(scCurrency.chainId)), {
                state: {
                    ...addressData.lnurlResult,
                    min: addressData.lnurlResult.min.toString(10),
                    max: addressData.lnurlResult.max.toString(10),
                }
            });
        }
    }, [addressData?.lnurlResult]);
    //Amounts
    const inputRef = useRef();
    const outputRef = useRef();
    const [validatedAmount, setValidatedAmount] = useBigNumberState(null);
    const [_exactIn, setExactIn] = useState(true);
    const exactIn = addressData?.swapType === SwapType.TO_BTCLN && !addressData?.isLnurl ? false : _exactIn;
    const { inConstraints, outConstraints, supportedTokensSet, handleQuoteError } = useAmountConstraints(exactIn, inputToken, outputToken);
    //Url defined amount & swap type
    useEffect(() => {
        const swapType = params.get("swapType");
        if (swapType != null)
            setSwapType(parseInt(swapType));
        const chainId = params.get("chainId");
        const token = params.get("token");
        if (chainId != null && token != null) {
            const scToken = Tokens[chainId]?.[token];
            if (scToken != null)
                setScCurrency(scToken);
        }
        const exactIn = params.get("exactIn");
        const amount = params.get("amount");
        if (exactIn != null && amount != null) {
            setExactIn(exactIn === "true");
            if (exactIn === "true") {
                inputRef.current.setValue(amount, false);
            }
            else {
                outputRef.current.setValue(amount, false);
            }
        }
    }, [search]);
    //Allowed tokens
    const allowedScTokens = useMemo(() => {
        if (supportedTokensSet == null)
            return props.supportedCurrencies;
        return props.supportedCurrencies
            .filter(currency => supportedTokensSet.has(currency.chainId + ":" + currency.address));
    }, [props.supportedCurrencies, supportedTokensSet]);
    //Quote
    const [refreshQuote, quote, quoteLoading, quoteError] = useQuote(existingSwap != null ? null : signerData?.signer, validatedAmount, exactIn, inputToken, outputToken, !isSend ? null : (validatedAddress == null || validatedAddress === "") && swapType === SwapType.TO_BTC ? RANDOM_BTC_ADDRESS :
        addressData?.error ? null :
            addressData?.isLnurl ? addressData.lnurlResult :
                addressData?.address, handleQuoteError);
    const outputAddress = existingSwap?.getType() === SwapType.TO_BTCLN ? (existingSwap.getLNURL() ?? existingSwap.getLightningInvoice()) :
        existingSwap?.getType() === SwapType.TO_BTC ? existingSwap.getBitcoinAddress() :
            (swapType === SwapType.TO_BTC && bitcoinWallet != null) ? bitcoinWallet.getReceiveAddress() : null;
    const inputAmount = existingSwap != null ? existingSwap.getInput().amount :
        !exactIn ? (quote == null ? "" : quote.getInput().amount) :
            null;
    const outputAmount = existingSwap != null ? existingSwap.getOutput().amount :
        exactIn ? (quote == null ? "" : quote.getOutput().amount) :
            isSend ? addressData?.amount?.toString() : null;
    const inputValue = usePricing(existingSwap != null ? new BigNumber(existingSwap.getInput().amount) :
        exactIn ? validatedAmount :
            quote != null ? new BigNumber(quote.getInput().amount) : null, inputToken);
    const outputValue = usePricing(existingSwap != null ? new BigNumber(existingSwap.getOutput().amount) :
        !exactIn ? validatedAmount :
            quote != null ? new BigNumber(quote.getOutput().amount) : null, outputToken);
    //Max spendable
    const maxSpendable = useWalletBalance(signerData?.random ? null : signerData?.signer, inputToken, locked);
    let inputMax = BigNumber.min(maxSpendable?.amount ?? new BigNumber(Infinity), inConstraints?.max ?? new BigNumber(Infinity));
    if (!inputMax.isFinite())
        inputMax = null;
    //QR scanner
    const [qrScanning, setQrScanning] = useState(false);
    const leaveExistingSwap = (noChangeSwapType, noSetAddress) => {
        if (existingSwap != null) {
            const scCurrency = existingSwap.getType() === SwapType.TO_BTC || existingSwap.getType() === SwapType.TO_BTCLN ? existingSwap.getInput().token : existingSwap.getOutput().token;
            const swapAddress = existingSwap.getType() === SwapType.TO_BTC ? existingSwap.getBitcoinAddress() :
                existingSwap.getType() === SwapType.TO_BTCLN ? existingSwap.getLNURL() : null;
            if (!noChangeSwapType) {
                console.trace("SwapNew: leaveExistingSwap(): Setting swap type: " + SwapType[existingSwap.getType()]);
                setSwapType(existingSwap.getType());
            }
            setScCurrency(scCurrency);
            if (!noSetAddress && swapAddress != null)
                addressRef.current.setValue(swapAddress, false);
            navigate("/");
        }
    };
    const changeDirection = () => {
        if (locked)
            return;
        leaveExistingSwap(true, true);
        setExactIn(!exactIn);
        console.log("SwapNew: changeDirection(): Current swap type: " + SwapType[swapType]);
        if (swapType === SwapType.TO_BTCLN)
            setSwapType(SwapType.FROM_BTCLN);
        if (swapType === SwapType.TO_BTC)
            setSwapType(SwapType.FROM_BTC);
        if (swapType === SwapType.FROM_BTCLN)
            setSwapType(SwapType.TO_BTCLN);
        if (swapType === SwapType.FROM_BTC)
            setSwapType(SwapType.TO_BTC);
        addressRef.current.setValue("", false);
        if (existingSwap != null)
            return;
        if (exactIn) {
            outputRef.current.setValue(inputRef.current.getValue(), false);
        }
        else {
            inputRef.current.setValue(outputRef.current.getValue(), false);
        }
    };
    const webLnForOutput = existingSwap == null && lnWallet != null && swapType === SwapType.TO_BTCLN;
    useEffect(() => {
        if (!webLnForOutput)
            return;
        if (exactIn) {
            inputRef.current.setValue("");
            setExactIn(false);
        }
        addressRef.current.setValue("");
    }, [webLnForOutput]);
    const btcWalletForOutput = existingSwap == null && bitcoinWallet != null && swapType === SwapType.TO_BTC;
    const isSwapToRandomBtcAddress = quote != null && quote.getType() === SwapType.TO_BTC &&
        quote.getBitcoinAddress() === RANDOM_BTC_ADDRESS;
    //Don't lock amounts when WebLN wallet is connected
    const amountsLocked = webLnForOutput ? false : addressData?.amount != null;
    const setAmountLock = useCallback((val) => {
        if (existingSwap == null) {
            if (val) {
                setUnlocked(false);
                navigate("/?swapId=" + quote.getIdentifierHashString());
            }
            else {
                navigate("/");
            }
        }
        else {
            if (val) {
                setUnlocked(false);
            }
            else {
                setUnlocked(true);
            }
        }
    }, [quote, existingSwap]);
    const [_inputAmountValue, setInputAmountValue] = useState();
    const inputAmountValue = inputAmount ?? _inputAmountValue;
    let shouldShowUseExternalWallet = false;
    if (inConstraints?.max != null && maxSpendable?.amount != null && inputAmountValue != null && !isSend) {
        const parsedAmount = new BigNumber(inputAmountValue);
        console.log("Parsed amount: ", parsedAmount);
        if (!parsedAmount.isNaN())
            shouldShowUseExternalWallet = parsedAmount.gt(maxSpendable?.amount) && parsedAmount.lte(inConstraints.max);
    }
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 0, enabled: !locked }), _jsx(QRScannerModal, { onScanned: (data) => {
                    console.log("QR scanned: ", data);
                    addressRef.current.setValue(data);
                    setQrScanning(false);
                }, show: qrScanning, onHide: () => setQrScanning(false) }), _jsx("div", { className: "d-flex flex-column align-items-center text-white", children: _jsxs(Card, { className: "p-3 swap-panel tab-bg mx-3 mb-3 border-0", children: [_jsx(ErrorAlert, { title: "Quote error", error: quoteError }), _jsxs(Card, { className: "d-flex flex-column tab-accent-p3 pt-2", children: [_jsxs("div", { className: "d-flex flex-row", children: [_jsx("small", { className: "text-light text-opacity-75 me-auto", children: "You pay" }), maxSpendable != null ? (_jsxs(_Fragment, { children: [_jsx("small", { className: "", children: _jsx(ConnectedWalletAnchor, { noText: true, currency: inputToken }) }), _jsxs("small", { className: "me-2", children: [maxSpendable.amountString, " ", inputToken.ticker] }), _jsx(Button, { variant: "outline-light", style: { marginBottom: "2px" }, className: "py-0 px-1", disabled: locked || amountsLocked, onClick: () => {
                                                        setExactIn(true);
                                                        inputRef.current.setValue(maxSpendable.amountString);
                                                    }, children: _jsx("small", { className: "font-smallest", style: { marginBottom: "-2px" }, children: "MAX" }) })] })) : (_jsx("small", { children: _jsx(ConnectedWalletAnchor, { noText: false, currency: inputToken }) }))] }), _jsx(ValidatedInput, { disabled: locked || amountsLocked || webLnForOutput, inputRef: inputRef, className: "flex-fill", type: "number", value: inputAmount, size: "lg", textStart: !exactIn && quoteLoading ? (_jsx(Spinner, { size: "sm", className: "text-white" })) : null, onChange: (value) => {
                                        console.log("SwapNew: ValidatedInput(inputAmount): onChange: ", value);
                                        setInputAmountValue(value);
                                        leaveExistingSwap();
                                        setExactIn(true);
                                    }, onValidatedInput: val => {
                                        if (exactIn)
                                            setValidatedAmount(val);
                                    }, inputId: "amount-input", inputClassName: "font-weight-500", floatingLabel: inputValue == null ? null : FEConstants.USDollar.format(inputValue), expectingFloatingLabel: true, step: inputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-(inputToken.displayDecimals ?? inputToken.decimals))), min: inConstraints?.min, max: inputMax, feedbackEndElement: shouldShowUseExternalWallet ? (_jsx("a", { className: "ms-auto", href: "#", onClick: (event) => {
                                            event.preventDefault();
                                            disconnect();
                                        }, children: "Use external wallet" })) : null, validated: (!exactIn && quote != null) || existingSwap != null ? null : undefined, elementEnd: (_jsx(CurrencyDropdown, { currencyList: !isSend ? bitcoinTokenArray : allowedScTokens, onSelect: val => {
                                            if (locked)
                                                return;
                                            leaveExistingSwap(true);
                                            if (!isSend) {
                                                if (isBtcToken(val)) {
                                                    const swapType = val.lightning ? SwapType.FROM_BTCLN : SwapType.FROM_BTC;
                                                    console.log("SwapNew: CurrencyDropdown(input): Setting swap type: " + SwapType[swapType]);
                                                    setSwapType(swapType);
                                                }
                                            }
                                            else {
                                                if (isSCToken(val))
                                                    setScCurrency(val);
                                            }
                                        }, value: inputToken, className: "round-right text-white bg-black bg-opacity-10" })) })] }), _jsx("div", { className: "d-flex justify-content-center swap-direction-wrapper", children: _jsx(Button, { onClick: changeDirection, size: "lg", className: "px-0 swap-direction-btn", children: _jsx(Icon, { size: 22, icon: arrows_vertical, style: { marginTop: "-8px" } }) }) }), _jsxs(Card, { className: "tab-accent-p3 pt-2", children: [_jsxs("div", { className: "d-flex flex-row", children: [_jsx("small", { className: "text-light text-opacity-75 me-auto", children: "You receive" }), _jsx("small", { children: _jsx(ConnectedWalletAnchor, { noText: false, currency: outputToken }) })] }), _jsx("div", { className: "d-flex flex-row", children: _jsx(ValidatedInput, { disabled: locked || amountsLocked, inputRef: outputRef, className: "flex-fill strip-group-text", type: "number", value: outputAmount, size: "lg", textStart: exactIn && quoteLoading ? (_jsx(Spinner, { size: "sm", className: "text-white" })) : null, onChange: val => {
                                            console.log("SwapNew: ValidatedInput(outputAmount): onChange: ", val);
                                            leaveExistingSwap();
                                            setExactIn(false);
                                            if (webLnForOutput)
                                                addressRef.current.setValue("");
                                        }, onValidatedInput: val => {
                                            if (!exactIn)
                                                setValidatedAmount(val);
                                        }, inputId: "amount-output", inputClassName: "font-weight-500", floatingLabel: outputValue == null ? null : FEConstants.USDollar.format(outputValue), expectingFloatingLabel: true, step: outputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-(outputToken.displayDecimals ?? outputToken.decimals))), min: outConstraints?.min, max: outConstraints?.max, validated: (exactIn && quote != null) || existingSwap != null ? null : undefined, elementEnd: (_jsx(CurrencyDropdown, { currencyList: isSend ? bitcoinTokenArray : allowedScTokens, onSelect: (val) => {
                                                if (locked)
                                                    return;
                                                leaveExistingSwap(true, true);
                                                if (isSend) {
                                                    if (isBtcToken(val)) {
                                                        const swapType = val.lightning ? SwapType.TO_BTCLN : SwapType.TO_BTC;
                                                        console.log("SwapNew: CurrencyDropdown(input): Setting swap type: " + SwapType[swapType]);
                                                        setSwapType(swapType);
                                                    }
                                                    addressRef.current.setValue("", false);
                                                }
                                                else {
                                                    if (isSCToken(val))
                                                        setScCurrency(val);
                                                }
                                            }, value: outputToken, className: "round-right text-white bg-black bg-opacity-10" })) }) }), _jsxs("div", { className: "flex-column " + (isSend ? "d-flex" : "d-none"), children: [_jsx(ValidatedInput, { type: "text", className: "flex-fill mt-3 " + (webLnForOutput && (validatedAddress == null || validatedAddress === "") ? "d-none" : ""), onChange: (val) => leaveExistingSwap(false, true), onValidatedInput: setValidatedAddress, value: outputAddress, inputRef: addressRef, placeholder: "Paste Bitcoin/Lightning address", onValidate: addressValidator, validated: addressData?.error, disabled: locked || webLnForOutput || btcWalletForOutput, textStart: addressLoading ? (_jsx(Spinner, { size: "sm", className: "text-white" })) : null, textEnd: locked || webLnForOutput ? null : (btcWalletForOutput ? (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Disconnect bitcoin wallet & use external wallet" }), children: _jsx("a", { href: "#", style: {
                                                        marginTop: "-3px"
                                                    }, onClick: (e) => {
                                                        e.preventDefault();
                                                        disconnect();
                                                    }, children: _jsx(Icon, { size: 24, icon: ic_power_off_outline }) }) })) : (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Scan QR code" }), children: _jsx("a", { href: "#", style: {
                                                        marginTop: "-3px"
                                                    }, onClick: (e) => {
                                                        e.preventDefault();
                                                        setQrScanning(true);
                                                    }, children: _jsx(Icon, { size: 24, icon: ic_qr_code_scanner }) }) }))), successFeedback: btcWalletForOutput ? "Address fetched from your " + bitcoinWallet.getName() + " wallet!" :
                                                webLnForOutput ? "Lightning invoice fetched from your WebLN lightning wallet!" : null }), webLnForOutput ? (_jsx(_Fragment, { children: validatedAddress == null || validatedAddress === "" ? (_jsx("div", { className: "mt-2", children: _jsx("a", { href: "#", onClick: (e) => {
                                                        e.preventDefault();
                                                        if (validatedAmount == null)
                                                            return;
                                                        lnWallet.makeInvoice(fromHumanReadable(validatedAmount, Tokens.BITCOIN.BTCLN).toNumber()).then(res => {
                                                            addressRef.current.setValue(res.paymentRequest);
                                                        }).catch(e => console.error(e));
                                                    }, children: "Fetch invoice from WebLN" }) })) : "" })) : "", _jsx(Alert, { variant: "success", className: "mt-3 mb-0 text-center", show: !locked && lnWallet == null && swapType === SwapType.TO_BTCLN && addressData == null && existingSwap == null, children: _jsx("label", { children: "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount." }) })] })] }), quoteError != null ? (_jsx(Button, { variant: "light", className: "mt-3", onClick: refreshQuote, children: "Retry" })) : "", quote != null || existingSwap != null ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-3", children: _jsx(SimpleFeeSummaryScreen, { swap: existingSwap ?? quote, btcFeeRate: inputToken.chain === "BTC" ? maxSpendable?.feeRate : null }) }), !isSwapToRandomBtcAddress ? (_jsx("div", { className: "mt-3 d-flex flex-column text-white", children: _jsx(QuoteSummary, { type: "swap", quote: existingSwap ?? quote, balance: maxSpendable?.rawAmount ?? null, refreshQuote: () => {
                                            if (existingSwap != null) {
                                                if (existingSwap.exactIn) {
                                                    inputRef.current.setValue(existingSwap.getInput().amount, false);
                                                }
                                                else {
                                                    outputRef.current.setValue(existingSwap.getOutput().amount, false);
                                                }
                                                leaveExistingSwap();
                                            }
                                            refreshQuote();
                                        }, setAmountLock: setAmountLock, abortSwap: () => {
                                            inputRef.current.setValue("");
                                            outputRef.current.setValue("");
                                            navigate("/");
                                        }, feeRate: maxSpendable?.feeRate }) })) : ""] })) : ""] }) }), _jsx("div", { className: "text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3", children: _jsxs("div", { className: "cursor-pointer d-flex align-items-center justify-content-center", onClick: () => navigate("/faq?tabOpen=6"), children: [_jsx(Icon, { size: 18, icon: lock, style: { marginTop: "-0.5rem" } }), _jsx("small", { children: "Audited by" }), _jsx("img", { className: "opacity-50 d-block ms-1", height: 18, src: "/ackee_blockchain.svg", style: { marginTop: "-0.125rem" } })] }) })] }));
}
