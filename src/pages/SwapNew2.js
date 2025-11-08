import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import ValidatedInput from '../components/ValidatedInput';
import { QRScannerModal } from '../qr/QRScannerModal';
import { Alert, Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { CurrencyDropdown } from '../tokens/CurrencyDropdown';
import { SimpleFeeSummaryScreen } from '../fees/SimpleFeeScreen';
import { QuoteSummary } from '../swaps/QuoteSummary';
import { SwapStepAlert } from '../swaps/components/SwapStepAlert';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExistingSwap } from '../swaps/hooks/useExistingSwap';
import { ConnectedWalletAnchor } from '../wallets/ConnectedWalletAnchor';
import { AuditedBy } from '../components/AuditedBy';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useSwapPage } from './useSwapPage';
export function SwapNew2() {
    const navigate = useNavigate();
    const swapPage = useSwapPage();
    //Existing swap quote
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get('swapId');
    const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
    const [isUnlocked, setUnlocked] = useState(false);
    const [reversed, setReversed] = useState(false);
    const locked = !isUnlocked && existingSwap != null;
    //QR scanner
    const [qrScanning, setQrScanning] = useState(false);
    //Leaves existing swap
    const leaveExistingSwap = useCallback((noSetAddress, noSetAmounts) => {
        if (existingSwap == null)
            return;
        //TODO: Fix
        // setInputToken(existingSwap.getInput().token);
        // setOutputToken(existingSwap.getOutput().token);
        // if (!noSetAddress) addressRef.current.setValue(existingSwap.getOutputAddress());
        // if (!noSetAmounts)
        //   if (existingSwap.exactIn) {
        //     inputRef.current.setValue(existingSwap.getInput().amount);
        //   } else {
        //     outputRef.current.setValue(existingSwap.getOutput().amount);
        //   }
        navigate('/');
    }, [existingSwap]);
    return (_jsxs(_Fragment, { children: [_jsx(QRScannerModal, { onScanned: (data) => {
                    console.log('QR scanned: ', data);
                    swapPage.output.address?.onChange(data);
                    setQrScanning(false);
                }, show: qrScanning, onHide: () => setQrScanning(false) }), _jsx("div", { className: "d-flex flex-column align-items-center text-white", children: _jsxs("div", { className: "swap-panel", children: [existingSwap != null ? null : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [_jsxs("div", { className: "swap-panel__card__header", children: [_jsx("div", { className: "swap-panel__card__title", children: "You pay" }), swapPage.input.wallet?.spendable != null ? (_jsx("div", { className: "swap-connected-wallet", children: _jsx("div", { className: "swap-panel__card__wallet", children: _jsx(ConnectedWalletAnchor, { noText: false, simple: true, setMax: () => swapPage.input.amount.onChange(swapPage.input.wallet.spendable.amount), currency: swapPage.input.token.value, variantButton: "clear", maxSpendable: swapPage.input.wallet?.spendable }) }) })) : (_jsx("div", { className: "swap-panel__card__wallet", children: _jsx(ConnectedWalletAnchor, { noText: false, simple: true, currency: swapPage.input.token.value, variantButton: "clear" }) }))] }), _jsxs("div", { className: "swap-panel__card__body", children: [_jsx(CurrencyDropdown, { currencyList: swapPage.input.token.values, onSelect: swapPage.input.token.onChange, value: swapPage.input.token.value, className: "round-right text-white bg-black bg-opacity-10" }), _jsx(ValidatedInput, { disabled: swapPage.input.amount.disabled, className: "swap-panel__input-wrapper", placeholder: '0.00', type: "number", value: swapPage.input.amount.value, size: 'lg', textStart: swapPage.input.amount.loading ? _jsx(Spinner, { className: "text-white" }) : null, onChange: swapPage.input.amount.onChange, inputId: "amount-input", inputClassName: "swap-panel__input", floatingLabelClassName: "swap-panel__label", floatingLabel: swapPage.input.amount.valueUsd, expectingFloatingLabel: true, step: swapPage.input.amount.step, min: swapPage.input.amount.min, max: swapPage.input.amount.max, feedbackEndElement: swapPage.input.useExternalWallet ? (_jsx("a", { className: "use-external", href: "#", onClick: (event) => {
                                                            event.preventDefault();
                                                            swapPage.input.useExternalWallet();
                                                        }, children: "Use external wallet" })) : null, validated: swapPage.input.amount.validation?.status === 'error'
                                                        ? swapPage.input.amount.validation.text
                                                        : undefined })] })] }), _jsx("div", { className: "swap-panel__toggle", children: _jsx(Button, { onClick: () => {
                                            if (locked)
                                                return;
                                            setReversed((v) => !v);
                                            swapPage.changeDirection();
                                        }, size: "lg", className: "swap-panel__toggle__button", style: {
                                            transition: 'transform 0.35s ease',
                                            transform: reversed ? 'rotate(180deg)' : 'rotate(0deg)',
                                        }, children: _jsx("div", { className: "icon icon-swap" }) }) }), _jsxs("div", { className: "swap-panel__group", children: [_jsxs("div", { className: "swap-panel__card", children: [_jsxs("div", { className: "swap-panel__card__header", children: [_jsx("div", { className: "swap-panel__card__title", children: "You receive" }), _jsx("div", { className: "swap-panel__card__wallet", children: _jsx(ConnectedWalletAnchor, { noText: false, simple: true, currency: swapPage.output.token.value, variantButton: "clear", maxSpendable: swapPage.output.wallet?.balance }) })] }), _jsxs("div", { className: "swap-panel__card__body", children: [_jsx(CurrencyDropdown, { currencyList: swapPage.output.token.values, onSelect: swapPage.output.token.onChange, value: swapPage.output.token.value, className: "round-right text-white bg-black bg-opacity-10" }), _jsx(ValidatedInput, { disabled: swapPage.output.amount.disabled, className: "swap-panel__input-wrapper", type: "number", value: swapPage.output.amount.value, size: 'lg', textStart: swapPage.output.amount.loading ? _jsx(Spinner, { className: "text-white" }) : null, onChange: swapPage.output.amount.onChange, inputId: "amount-output", inputClassName: "swap-panel__input", floatingLabelClassName: "swap-panel__label", placeholder: '0.00', floatingLabel: swapPage.output.amount.valueUsd, expectingFloatingLabel: true, step: swapPage.output.amount.step, min: swapPage.output.amount.min, max: swapPage.output.amount.max, validated: swapPage.output.amount.validation?.status === 'error'
                                                                ? swapPage.output.amount.validation.text
                                                                : undefined })] }), _jsx("div", { className: swapPage.output.gasDrop != null ? 'd-flex' : 'd-none', children: _jsx(ValidatedInput, { type: 'checkbox', className: "swap-panel__input-wrapper", onChange: swapPage.output.gasDrop?.onChange, placeholder: _jsx("span", { children: _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'fee-tooltip-gas-drop', children: _jsxs("span", { children: ["Swap some amount of BTC to", ' ', swapPage.output.gasDrop?.amount.token.ticker, " (gas token on the destination chain), so that you can transact on", ' ', swapPage.output.gasDrop?.amount.token.chainId] }) }), children: _jsxs("span", { className: "dottedUnderline", children: ["Request gas drop of", ' ', swapPage.output.gasDrop?.amount._amount.toString(10), ' ', swapPage.output.gasDrop?.amount.token.ticker] }) }) }), value: swapPage.output.gasDrop?.checked, onValidate: () => null, disabled: locked }) })] }), _jsx("div", { className: 'swap-panel__card ' + (!swapPage.output.address ? 'd-none' : 'd-flex'), children: _jsx("div", { className: "swap-panel__card__body", children: _jsxs("div", { className: "wallet-address", children: [swapPage.output.webln?.fetchInvoice ? (_jsx("div", { className: "wallet-address__body", children: _jsxs("a", { href: "#", className: "wallet-address__invoice-button", onClick: swapPage.output.webln.fetchInvoice, children: [_jsx("i", { className: "icon icon-Lightning-invoice" }), _jsx("span", { className: "sc-text", children: "Fetch invoice from WebLN" })] }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "wallet-address__body", children: [_jsxs("div", { className: "wallet-address__title", children: [swapPage.output.chainId ?? 'Wallet', " Destination Address"] }), _jsx(ValidatedInput, { type: 'text', className: 'wallet-address__form with-inline-icon', onChange: swapPage.output.address?.onChange, value: swapPage.output.address?.value, placeholder: 'Enter destination address', validated: swapPage.output.address?.validation?.status === 'error'
                                                                                ? swapPage.output.address?.validation.text
                                                                                : null, disabled: swapPage.output.address?.disabled, textEnd: swapPage.output.address?.loading ? (_jsx(Spinner, { className: "text-white" })) : swapPage.output.address?.validation?.status === 'success' ? (_jsx("span", { className: "icon icon-check" })) : swapPage.output.address?.validation?.status === 'error' ? (_jsx("span", { className: "icon icon-invalid-error" })) : swapPage.output.address?.validation?.status === 'warning' ? (_jsx("span", { className: "icon icon-info" })) : null, successFeedback: swapPage.output.address?.validation?.status === 'success'
                                                                                ? swapPage.output.address?.validation.text
                                                                                : null, dynamicTextEndPosition: true }), swapPage.output.address?.validation?.status === 'warning' ? (_jsx("div", { className: "wallet-address__feedback is-warning", children: swapPage.output.address.validation.text })) : ('')] }), _jsx("div", { className: "wallet-address__action", children: swapPage.output.wallet != null ? (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Disconnect wallet & use external wallet" }), children: _jsx("a", { href: "#", className: "wallet-address__action__button", onClick: (e) => {
                                                                                e.preventDefault();
                                                                                swapPage.output.wallet.disconnect();
                                                                            }, children: _jsx("span", { className: "icon icon-disconnect" }) }) })) : (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Scan QR code" }), children: _jsx("a", { href: "#", className: "wallet-address__action__button", onClick: (e) => {
                                                                                e.preventDefault();
                                                                                setQrScanning(true);
                                                                            }, children: _jsx("span", { className: "icon icon-qr-scan" }) }) })) })] })), _jsx(Alert, { variant: 'success', className: "wallet-address__alert mb-0 text-center", show: swapPage.output.showLightningAlert, children: _jsx("label", { children: "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount." }) })] }) }) })] })] })), swapPage.quote.quote != null || existingSwap != null ? (_jsxs(_Fragment, { children: [!(existingSwap ?? swapPage.quote.quote).isInitiated() ? (_jsx("div", { className: "mt-3", children: _jsx(SimpleFeeSummaryScreen, { swap: existingSwap ?? swapPage.quote.quote, btcFeeRate: swapPage.input.wallet?.btcFeeRate, onRefreshQuote: () => {
                                            if (existingSwap != null)
                                                navigate('/');
                                            swapPage.quote.refresh();
                                        } }) })) : null, !swapPage.quote.isRandom || swapPage.swapTypeData.requiresOutputWallet ? (_jsx("div", { className: "d-flex flex-column text-white", children: _jsx(QuoteSummary, { type: "swap", quote: existingSwap ?? swapPage.quote.quote, balance: swapPage.input.wallet?.spendable?.rawAmount, refreshQuote: () => {
                                            if (existingSwap != null)
                                                navigate('/');
                                            swapPage.quote.refresh();
                                        }, setAmountLock: (isLocked) => {
                                            if (!isLocked)
                                                return;
                                            if (existingSwap == null)
                                                navigate('/?swapId=' + swapPage.quote.quote.getId());
                                        }, abortSwap: () => {
                                            swapPage.input.amount.onChange('');
                                            navigate('/');
                                        }, feeRate: swapPage.input.wallet?.btcFeeRate }) })) : ('')] })) : (''), _jsx(SwapStepAlert, { type: "error", icon: ic_warning, title: "Quote error", description: swapPage.quote.error?.message ?? 'An error occurred while fetching the quote', error: swapPage.quote.error, show: swapPage.quote.error != null, className: "swap-panel__error", action: {
                                type: 'button',
                                text: 'Retry',
                                onClick: swapPage.quote.refresh,
                                variant: 'secondary',
                            } })] }) }), _jsx(AuditedBy, { chainId: swapPage.smartChainId })] }));
}
