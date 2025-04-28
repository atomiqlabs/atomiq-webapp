import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BitcoinNetwork, isBtcToken, isSCToken, SwapType } from "@atomiqlabs/sdk";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useAddressData } from "../swaps/hooks/useAddressData";
import ValidatedInput from "../components/ValidatedInput";
import { useAmountConstraints } from "../swaps/hooks/useAmountConstraints";
import { useWalletBalance } from "../wallets/hooks/useWalletBalance";
import { useBigNumberState } from "../utils/hooks/useBigNumberState";
import { SwapTopbar } from "../components/SwapTopbar";
import { QRScannerModal } from "../components/qr/QRScannerModal";
import { Alert, Button, Card, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { bitcoinTokenArray, fromHumanReadable, smartChainTokenArray, toHumanReadable } from "../utils/Currencies";
import { FEConstants, Tokens } from "../FEConstants";
import BigNumber from "bignumber.js";
import { CurrencyDropdown } from "../components/CurrencyDropdown";
import { SimpleFeeSummaryScreen } from "../components/fees/SimpleFeeScreen";
import { QuoteSummary } from "../components/quotes/QuoteSummary";
import { ErrorAlert } from "../components/ErrorAlert";
import { useQuote } from "../swaps/hooks/useQuote";
import { usePricing } from "../swaps/hooks/usePricing";
import * as randomBytes from "randombytes";
import { Address, NETWORK, TEST_NETWORK } from "@scure/btc-signer";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "react-icons-kit";
import { arrows_vertical } from 'react-icons-kit/ikons/arrows_vertical';
import { ic_qr_code_scanner } from 'react-icons-kit/md/ic_qr_code_scanner';
import { lock } from 'react-icons-kit/fa/lock';
import { ic_power_off_outline } from 'react-icons-kit/md/ic_power_off_outline';
import { useExistingSwap } from "../swaps/hooks/useExistingSwap";
import { ConnectedWalletAnchor } from "../components/wallet/ConnectedWalletAnchor";
import { useStateWithOverride } from "../swaps/hooks/useStateWithOverride";
const RANDOM_BTC_ADDRESS = Address(FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? TEST_NETWORK : NETWORK).encode({
    type: "wsh",
    hash: randomBytes(32)
});
export function SwapNew(props) {
    const navigate = useNavigate();
    const { swapper } = useContext(SwapsContext);
    //Existing swap quote
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get("swapId");
    const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
    const [isUnlocked, setUnlocked] = useState(false);
    const locked = !isUnlocked && existingSwap != null;
    //Tokens
    const [inputToken, setInputToken] = useStateWithOverride(Tokens.BITCOIN.BTC, existingSwap?.getInput().token);
    const [outputToken, setOutputToken] = useStateWithOverride(smartChainTokenArray[0], existingSwap?.getOutput().token);
    // const [_swapType, setSwapType] = useState<SwapType>(SwapType.FROM_BTC);
    // const [_scCurrency, setScCurrency] = useState<SCToken>(smartChainTokenArray[0]);
    // const swapType = useMemo(() => {
    //     if(existingSwap!=null) return existingSwap.getType();
    //     if(swapper!=null) {
    //         if(_swapType===SwapType.FROM_BTC || _swapType===SwapType.SPV_VAULT_FROM_BTC) {
    //             return swapper.supportsSwapType(_scCurrency.chainId, SwapType.SPV_VAULT_FROM_BTC) ?
    //                 SwapType.SPV_VAULT_FROM_BTC :
    //                 SwapType.FROM_BTC;
    //         }
    //     }
    //     return _swapType;
    // }, [existingSwap, swapper, _swapType, _scCurrency]);
    // console.log("Swap type: ", swapType);
    // const isSend: boolean = swapType===SwapType.TO_BTCLN || swapType===SwapType.TO_BTC;
    // const scCurrency: SCToken = existingSwap!=null ? (isSend ? existingSwap.getInput() : existingSwap.getOutput()).token as SCToken : _scCurrency;
    // const inputToken: Token | null = useMemo(
    //     () => swapType===SwapType.FROM_BTCLN ? Tokens.BITCOIN.BTCLN : (swapType===SwapType.FROM_BTC || swapType===SwapType.SPV_VAULT_FROM_BTC) ? Tokens.BITCOIN.BTC : scCurrency,
    //     [swapType, scCurrency]
    // );
    // const outputToken: Token | null = useMemo(
    //     () => swapType===SwapType.TO_BTCLN ? Tokens.BITCOIN.BTCLN : swapType===SwapType.TO_BTC ? Tokens.BITCOIN.BTC : scCurrency,
    //     [swapType, scCurrency]
    // );
    // const signerData = scCurrency==null ? null : chains[scCurrency.chainId];
    //Address
    const addressRef = useRef();
    const addressValidator = useCallback((val) => {
        try {
            if (swapper.Utils.parseAddressSync(val) == null)
                return "Invalid address";
        }
        catch (e) {
            return e.message;
        }
        return null;
    }, [swapper]);
    const [address, setAddress] = useState(null);
    const [addressData, addressLoading, addressError] = useAddressData(address);
    const isValidAddress = addressData != null;
    const isFixedAmount = addressData?.min?.rawAmount != null && addressData?.min?.rawAmount === addressData?.max?.rawAmount;
    useEffect(() => {
        if (addressData?.swapType != null) {
            //TODO: Automatically change to the swap type as decoded from the address type
        }
    }, [addressData?.swapType]);
    useEffect(() => {
        if (addressData?.lnurl?.type === "withdraw")
            navigate("/scan/2?address=" + encodeURIComponent(address));
    }, [address, addressData?.lnurl]);
    //Amounts
    const inputRef = useRef();
    const outputRef = useRef();
    const [validatedAmount, setValidatedAmount] = useBigNumberState(null);
    const [exactIn, setExactIn] = useStateWithOverride(true, !isFixedAmount);
    const { input: inputLimits, output: outputLimits } = useAmountConstraints(inputToken, outputToken);
    //Url defined amount & swap type
    useEffect(() => {
        const swapType = params.get("swapType");
        if (swapType != null)
            setSwapType(parseInt(swapType));
        const chainId = params.get("chainId");
        const token = params.get("token");
        if (chainId != null) {
            if (token != null) {
                const scToken = Tokens[chainId]?.[token];
                if (scToken != null)
                    setScCurrency(scToken);
            }
            else {
                const scTokens = Tokens[chainId];
                if (scTokens != null) {
                    const tickers = Object.keys(scTokens);
                    const scToken = scTokens[tickers[tickers.length - 1]];
                    if (scToken != null)
                        setScCurrency(scToken);
                }
            }
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
    //Gas drop
    const [gasDropChecked, setGasDropChecked] = useState(false);
    const gasDropToken = useMemo(() => {
        if (existingSwap != null) {
            if (existingSwap.getType() === SwapType.SPV_VAULT_FROM_BTC)
                return existingSwap.getGasOutput().token;
            return null;
        }
        if (swapper == null)
            return null;
        if (swapType !== SwapType.SPV_VAULT_FROM_BTC)
            return null;
        if (!isSCToken(outputToken))
            return null;
        const nativeToken = swapper.getNativeToken(outputToken.chainId);
        if (outputToken.address === swapper.getNativeTokenAddress(outputToken.chainId))
            return null;
        return nativeToken;
    }, [swapper, existingSwap, swapType, outputToken]);
    const gasDropAmount = existingSwap?.getType() === SwapType.SPV_VAULT_FROM_BTC && existingSwap.getGasOutput().rawAmount > 0n ?
        new BigNumber(existingSwap.getGasOutput().amount) :
        toHumanReadable(FEConstants.scBalances[gasDropToken?.chainId]?.optimal[gasDropToken?.address], gasDropToken);
    useEffect(() => {
        if (swapper == null || gasDropToken == null)
            return;
        let cancelled = false;
        if (existingSwap != null) {
            if (existingSwap.getType() === SwapType.SPV_VAULT_FROM_BTC) {
                setGasDropChecked(existingSwap.getGasOutput().rawAmount > 0n);
            }
            return;
        }
        //Check native currency balance
        if (addressData?.address == null)
            return;
        swapper.getNativeBalance(gasDropToken.chainId, addressData?.address).then(value => {
            if (cancelled)
                return;
            const requiredBalance = FEConstants.scBalances[gasDropToken.chainId].minimum[gasDropToken.address];
            if (value < requiredBalance) {
                setGasDropChecked(true);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [gasDropToken, addressData?.address, swapper]);
    //Max spendable
    const [minBtcTxFee, setMinBtcTxFee] = useState(null);
    const maxSpendable = useWalletBalance(signerData?.random ? null : signerData?.signer, inputToken, swapType, scCurrency.chainId, gasDropChecked, locked, minBtcTxFee);
    let inputMax = BigNumber.min(maxSpendable?.amount ?? new BigNumber(Infinity), inConstraints?.max ?? new BigNumber(Infinity));
    if (!inputMax.isFinite())
        inputMax = null;
    //Quote
    const quoteAddress = useMemo(() => {
        if (swapType === SwapType.TO_BTC || swapType === SwapType.TO_BTCLN || swapType === SwapType.SPV_VAULT_FROM_BTC) {
            if (validatedAddress == null || validatedAddress === "") {
                if (swapType === SwapType.TO_BTC)
                    return RANDOM_BTC_ADDRESS;
                if (swapType === SwapType.SPV_VAULT_FROM_BTC)
                    return signerData?.signer?.getAddress();
            }
            if (addressData?.error != null)
                return null;
            if (addressData?.isLnurl)
                return addressData.lnurlResult;
            return addressData?.address;
        }
    }, [isSend, validatedAddress, swapType, addressData, signerData]);
    const [refreshQuote, quote, quoteLoading, quoteError] = useQuote(existingSwap != null ? null : signerData?.signer, validatedAmount, exactIn, inputToken, outputToken, quoteAddress, gasDropToken != null && gasDropChecked ? FEConstants.scBalances[gasDropToken.chainId]?.optimal[gasDropToken.address] : null, handleQuoteError, maxSpendable?.feeRate);
    useEffect(() => {
        if (quote == null)
            return;
        if (swapType === SwapType.SPV_VAULT_FROM_BTC && quote?.getType() === SwapType.SPV_VAULT_FROM_BTC) {
            if (maxSpendable?.feeRate == null)
                return;
            const quoteMinFee = quote.minimumBtcFeeRate;
            if (quoteMinFee >= maxSpendable?.feeRate) {
                setMinBtcTxFee(quoteMinFee);
                return;
            }
        }
        setMinBtcTxFee(null);
    }, [quote, swapType, maxSpendable?.feeRate]);
    const outputAddress = useMemo(() => {
        if (existingSwap != null) {
            if (existingSwap.getType() === SwapType.TO_BTCLN) {
                const swap = existingSwap;
                return swap.getLNURL() ?? swap.getLightningInvoice();
            }
            if (existingSwap.getType() === SwapType.TO_BTC)
                return existingSwap.getBitcoinAddress();
            if (existingSwap.getType() === SwapType.SPV_VAULT_FROM_BTC)
                return existingSwap.getInitiator();
        }
        if (swapType === SwapType.TO_BTC && bitcoinWallet != null)
            return bitcoinWallet.getReceiveAddress();
        if (swapType === SwapType.SPV_VAULT_FROM_BTC && signerData?.signer != null && !signerData?.random)
            return signerData.signer.getAddress();
    }, [existingSwap, swapType, bitcoinWallet, signerData]);
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
        if (swapType === SwapType.FROM_BTC || swapType === SwapType.SPV_VAULT_FROM_BTC)
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
    const smartChainWalletForOutput = existingSwap == null && !signerData?.random && signerData?.signer != null && swapType === SwapType.SPV_VAULT_FROM_BTC;
    const isSwapToRandomScAddress = quote != null && quote.getType() === SwapType.SPV_VAULT_FROM_BTC && signerData?.random &&
        quote.getInitiator() === signerData?.signer?.getAddress();
    //Don't lock amounts when WebLN wallet is connected
    const amountsLocked = webLnForOutput ? false : addressData?.amount != null;
    const setAmountLock = useCallback((val) => {
        if (existingSwap == null) {
            if (val) {
                console.log("SwapNew: setAmountLock, locking swap and redirecting to swap: " + quote.getId());
                setUnlocked(false);
                navigate("/?swapId=" + quote.getId());
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
    //Show "Use external wallet" when amount is too high
    const [_inputAmountValue, setInputAmountValue] = useState();
    const inputAmountValue = inputAmount ?? _inputAmountValue;
    let shouldShowUseExternalWallet = false;
    if (inConstraints?.max != null && maxSpendable?.amount != null && inputAmountValue != null && swapType === SwapType.FROM_BTC) {
        const parsedAmount = new BigNumber(inputAmountValue);
        console.log("Parsed amount: ", parsedAmount);
        if (!parsedAmount.isNaN())
            shouldShowUseExternalWallet = parsedAmount.gt(maxSpendable?.amount) && parsedAmount.lte(inConstraints.max);
    }
    const { disconnect: outputWalletDisconnect, connect: outputWalletConnect, chainName: outputChainName } = useWalletForCurrency(outputToken);
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 0, enabled: !locked }), _jsx(QRScannerModal, { onScanned: (data) => {
                    console.log("QR scanned: ", data);
                    addressRef.current.setValue(data);
                    setQrScanning(false);
                }, show: qrScanning, onHide: () => setQrScanning(false) }), _jsx("div", { className: "d-flex flex-column align-items-center text-white", children: _jsxs(Card, { className: "p-3 swap-panel tab-bg mx-3 mb-3 border-0", children: [_jsx(ErrorAlert, { title: "Quote error", error: quoteError }), _jsxs(Card, { className: "d-flex flex-column tab-accent-p3 pt-2", children: [_jsxs("div", { className: "d-flex flex-row", children: [_jsx("small", { className: "text-light text-opacity-75 me-auto", children: "You pay" }), maxSpendable != null ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsx(ConnectedWalletAnchor, { noText: true, currency: inputToken }), _jsxs("small", { className: "me-2", children: [maxSpendable.amountString, " ", inputToken.ticker] })] }), _jsx(Button, { variant: "outline-light", style: { marginBottom: "2px" }, className: "py-0 px-1", disabled: locked || amountsLocked, onClick: () => {
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
                                            }, value: outputToken, className: "round-right text-white bg-black bg-opacity-10" })) }) }), _jsx("div", { className: (gasDropToken != null ? "d-flex" : "d-none"), children: _jsx(ValidatedInput, { type: "checkbox", className: "flex-fill mt-1", onChange: (val) => {
                                            setGasDropChecked(val);
                                            leaveExistingSwap(true, true);
                                        }, placeholder: (_jsx("span", { children: _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-gas-drop", children: _jsxs("span", { children: ["Swap some amount of BTC to ", gasDropToken?.ticker, " (gas token on the destination chain), so that you can transact on ", gasDropToken?.chainId] }) }), children: _jsx("span", { className: "dottedUnderline", children: "Request gas drop of " + gasDropAmount?.toString(10) + " " + gasDropToken?.ticker }) }) })), value: gasDropChecked, onValidate: () => null, disabled: locked }) }), _jsxs("div", { className: "flex-column " + (isSend || swapType === SwapType.SPV_VAULT_FROM_BTC ? "d-flex" : "d-none"), children: [_jsx(ValidatedInput, { type: "text", className: "flex-fill mt-3 " + (webLnForOutput && (validatedAddress == null || validatedAddress === "") ? "d-none" : ""), onChange: (val) => leaveExistingSwap(false, true), onValidatedInput: setValidatedAddress, value: outputAddress, inputRef: addressRef, placeholder: "Destination wallet address", onValidate: addressValidator, validated: addressData?.error, disabled: locked || webLnForOutput || btcWalletForOutput || smartChainWalletForOutput, feedbackEndElement: !webLnForOutput && !btcWalletForOutput && !smartChainWalletForOutput ? (_jsx("a", { className: "ms-auto", href: "#", onClick: (event) => {
                                                    event.preventDefault();
                                                    outputWalletConnect();
                                                }, children: "Connect wallet" })) : null, textStart: addressLoading ? (_jsx(Spinner, { size: "sm", className: "text-white" })) : null, textEnd: locked || webLnForOutput ? null : (btcWalletForOutput || smartChainWalletForOutput ? (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Disconnect wallet & use external wallet" }), children: _jsx("a", { href: "#", style: {
                                                        marginTop: "-3px"
                                                    }, onClick: (e) => {
                                                        e.preventDefault();
                                                        outputWalletDisconnect();
                                                    }, children: _jsx(Icon, { size: 24, icon: ic_power_off_outline }) }) })) : (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Scan QR code" }), children: _jsx("a", { href: "#", style: {
                                                        marginTop: "-3px"
                                                    }, onClick: (e) => {
                                                        e.preventDefault();
                                                        setQrScanning(true);
                                                    }, children: _jsx(Icon, { size: 24, icon: ic_qr_code_scanner }) }) }))), successFeedback: smartChainWalletForOutput ? "Address fetched from your " + signerData?.walletName + " wallet!" :
                                                btcWalletForOutput ? "Address fetched from your " + bitcoinWallet.getName() + " wallet!" :
                                                    webLnForOutput ? "Lightning invoice fetched from your WebLN lightning wallet!" : null }), webLnForOutput ? (_jsx(_Fragment, { children: validatedAddress == null || validatedAddress === "" ? (_jsx("div", { className: "mt-2", children: _jsx("a", { href: "#", onClick: (e) => {
                                                        e.preventDefault();
                                                        if (validatedAmount == null)
                                                            return;
                                                        lnWallet.makeInvoice(Number(fromHumanReadable(validatedAmount, Tokens.BITCOIN.BTCLN))).then(res => {
                                                            addressRef.current.setValue(res.paymentRequest);
                                                        }).catch(e => console.error(e));
                                                    }, children: "Fetch invoice from WebLN" }) })) : "" })) : "", _jsx(Alert, { variant: "success", className: "mt-3 mb-0 text-center", show: !locked && lnWallet == null && swapType === SwapType.TO_BTCLN && addressData == null && existingSwap == null, children: _jsx("label", { children: "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount." }) })] })] }), quoteError != null ? (_jsx(Button, { variant: "light", className: "mt-3", onClick: refreshQuote, children: "Retry" })) : "", quote != null || existingSwap != null ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-3", children: _jsx(SimpleFeeSummaryScreen, { swap: existingSwap ?? quote, btcFeeRate: inputToken.chain === "BTC" ? maxSpendable?.feeRate : null }) }), !isSwapToRandomBtcAddress && !isSwapToRandomScAddress ? (_jsx("div", { className: "mt-3 d-flex flex-column text-white", children: _jsx(QuoteSummary, { type: "swap", quote: existingSwap ?? quote, balance: maxSpendable?.rawAmount ?? null, refreshQuote: () => {
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
                                        }, feeRate: maxSpendable?.feeRate }) })) : ""] })) : ""] }) }), _jsx("div", { className: "text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3", children: _jsxs("div", { className: "cursor-pointer d-flex align-items-center justify-content-center", onClick: () => navigate("/faq?tabOpen=6"), children: [_jsx(Icon, { size: 18, icon: lock, style: { marginTop: "-0.5rem" } }), _jsx("small", { children: "Audited by" }), scCurrency?.chainId === "STARKNET" ? (_jsx("img", { className: "d-block ms-1", height: 18, src: "/csc-white-logo.png", style: { marginTop: "-0.075rem", opacity: 0.6 } })) : (_jsx("img", { className: "opacity-50 d-block ms-1", height: 18, src: "/ackee_blockchain.svg", style: { marginTop: "-0.125rem" } }))] }) })] }));
}
