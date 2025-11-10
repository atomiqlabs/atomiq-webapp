import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import ValidatedInput, { numberValidator } from '../../components/ValidatedInput';
import { CurrencyDropdown } from '../../tokens/CurrencyDropdown';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FeeSummaryScreen } from '../../fees/FeeSummaryScreen';
import { Badge, Button, Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { SwapType } from '@atomiqlabs/sdk';
import BigNumber from 'bignumber.js';
import { smartChainTokenArray } from '../../tokens/Tokens';
import { QuoteSummary } from '../../swaps/QuoteSummary';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapTopbar } from '../SwapTopbar';
import { SwapsContext } from '../../swaps/context/SwapsContext';
import { TokenIcon } from '../../tokens/TokenIcon';
import { useAddressData } from '../../swaps/hooks/useAddressData';
import { useAmountConstraints } from '../../swaps/hooks/useAmountConstraints';
import { useQuote } from '../../swaps/hooks/useQuote';
import { useWalletBalance } from '../../wallets/hooks/useWalletBalance';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Tokens } from '../../FEConstants';
import { useStateWithOverride } from '../../utils/hooks/useStateWithOverride';
export function QuickScanExecute() {
    const { swapper } = useContext(SwapsContext);
    const navigate = useNavigate();
    const goBack = () => navigate('/scan');
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const propAddress = params.get('address') || params.get('lightning');
    useEffect(() => {
        if (propAddress == null)
            goBack();
    }, [propAddress]);
    const [isLocked, setLocked] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [isCurrencyPreselected, setCurrencyPreselected] = useState(false);
    useEffect(() => {
        const propToken = params.get('token');
        const propChainId = params.get('chainId');
        if (propToken != null && propChainId != null) {
            setSelectedCurrency(Tokens[propChainId][propToken]);
            setCurrencyPreselected(true);
        }
    }, []);
    const [autoContinue, setAutoContinue] = useLocalStorage('crossLightning-autoContinue', false);
    const [addressResult, addressLoading, addressError] = useAddressData(propAddress);
    const inToken = addressResult?.swapType == null
        ? null
        : addressResult.swapType === SwapType.FROM_BTCLN
            ? Tokens.BITCOIN.BTCLN
            : selectedCurrency;
    const outToken = addressResult?.swapType == null
        ? null
        : addressResult.swapType === SwapType.TO_BTCLN
            ? Tokens.BITCOIN.BTCLN
            : addressResult.swapType === SwapType.TO_BTC
                ? Tokens.BITCOIN.BTC
                : selectedCurrency;
    const [amount, setAmount] = useStateWithOverride(null, addressResult?.amount?.amount);
    const exactIn = addressResult?.swapType === SwapType.FROM_BTCLN ||
        addressResult?.swapType === SwapType.FROM_BTC ||
        addressResult?.swapType === SwapType.SPV_VAULT_FROM_BTC;
    const btcToken = (exactIn ? inToken : outToken) ?? Tokens.BITCOIN.BTC;
    const { input: inputLimit, output: outputLimit } = useAmountConstraints(inToken, outToken);
    const btcConstraints = exactIn ? inputLimit : outputLimit;
    const amountConstraints = useMemo(() => {
        return {
            min: BigNumber.max(btcConstraints?.min ?? 0, new BigNumber(addressResult?.min?.amount) ?? 0),
            max: BigNumber.min(btcConstraints?.max ?? Infinity, new BigNumber(addressResult?.max?.amount) ?? Infinity),
        };
    }, [btcConstraints, addressResult]);
    const amountValidator = useCallback(numberValidator(amountConstraints, true), [
        amountConstraints,
    ]);
    const validatedAmount = useMemo(() => {
        if (amountValidator(amount) == null)
            return amount === '' ? null : new BigNumber(amount).toString(10);
    }, [amount]);
    const [refresh, quote, _, quoteLoading, quoteError] = useQuote(validatedAmount, exactIn, inToken, outToken, addressResult?.lnurl ?? addressResult?.address);
    const selectableCurrencies = useMemo(() => {
        if (swapper == null)
            return smartChainTokenArray;
        return swapper.getSwapCounterTokens(btcToken, exactIn);
    }, [swapper, exactIn, btcToken]);
    const walletBalanceResp = useWalletBalance(inToken, addressResult?.swapType);
    const walletBalance = walletBalanceResp?.balance?.rawAmount ?? null;
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 1, enabled: !isLocked }), _jsx("div", { className: "d-flex flex-column flex-fill justify-content-center align-items-center text-white", children: _jsxs("div", { className: "quickscan-summary-panel d-flex flex-column flex-fill", children: [_jsxs("div", { className: "p-3 d-flex flex-column tab-bg border-0 card", children: [_jsx(ValidatedInput, { type: 'text', className: "", disabled: true, value: addressResult?.address ?? propAddress }), _jsx(ErrorAlert, { className: "mt-3", title: "Destination parsing error", error: addressError }), addressLoading ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center tab-accent mt-3", children: [_jsx(Spinner, { animation: "border" }), "Loading data..."] })) : (''), addressError == null && swapper != null && !addressLoading ? (_jsxs("div", { className: "mt-3 tab-accent-p3 text-center", children: [_jsx("label", { className: "fw-bold mb-1", children: !exactIn ? 'Pay' : 'Withdraw' }), _jsx(ValidatedInput, { type: 'number', textEnd: _jsxs("span", { className: "text-white font-bigger d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: btcToken, className: "currency-icon" }), "BTC"] }), step: new BigNumber(10).pow(new BigNumber(-btcToken.decimals)), min: amountConstraints.min, max: amountConstraints.max, onValidate: amountValidator, disabled: addressResult?.amount != null || isLocked, size: 'lg', defaultValue: addressResult?.type !== 'LNURL'
                                                ? null
                                                : !exactIn
                                                    ? amountConstraints.min.toString(10)
                                                    : amountConstraints.max.toString(10), value: amount, onChange: (val) => {
                                                setAmount(val);
                                            }, placeholder: 'Input amount' }), _jsx("label", { className: "fw-bold mb-1", children: !exactIn ? 'with' : 'to' }), _jsx("div", { className: "d-flex justify-content-center", children: _jsx(CurrencyDropdown, { currencyList: selectableCurrencies, onSelect: (val) => {
                                                    if (isLocked)
                                                        return;
                                                    setSelectedCurrency(val);
                                                    setCurrencyPreselected(false);
                                                }, value: selectedCurrency, className: "bg-black bg-opacity-10 text-white" }) }), _jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-2", children: [_jsx(Form.Check // prettier-ignore
                                                , { id: "autoclaim-pay", type: "switch", onChange: (val) => setAutoContinue(val.target.checked), checked: autoContinue }), _jsx("label", { title: "", htmlFor: "autoclaim-pay", className: "form-check-label me-2", children: !exactIn ? 'Auto-pay' : 'Auto-claim' }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the transaction through your wallet - as soon as the swap pricing is returned." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })] })) : (''), quoteLoading ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center tab-accent mt-3", children: [_jsx(Spinner, { animation: "border" }), "Fetching quote..."] })) : (''), quoteError ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "my-3", title: "Quoting error", error: quoteError }), _jsx(Button, { onClick: refresh, variant: "secondary", children: "Retry" })] })) : (''), quote != null ? (_jsxs(_Fragment, { children: [_jsx(FeeSummaryScreen, { swap: quote, className: "mt-3 mb-3 tab-accent" }), _jsx(QuoteSummary, { UICallback: () => { }, type: 'payment', quote: quote, balance: walletBalance, refreshQuote: refresh, autoContinue: autoContinue && (!isCurrencyPreselected || addressResult?.amount != null) })] })) : (''), _jsx(ScrollAnchor, { trigger: quote != null })] }), _jsx("div", { className: "d-flex mt-auto py-4", children: _jsx(Button, { variant: "secondary flex-fill", disabled: isLocked, onClick: goBack, children: "< Back" }) })] }) })] }));
}
