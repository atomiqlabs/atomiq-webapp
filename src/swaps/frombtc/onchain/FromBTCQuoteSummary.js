import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { AlertMessage } from '../../../components/AlertMessage';
import { QRCodeSVG } from 'qrcode.react';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../../components/ScrollAnchor';
import { CopyOverlay } from '../../../components/CopyOverlay';
import { SwapExpiryProgressBar } from '../../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../../components/SwapForGasAlert';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../../components/StepByStep';
import { BaseButton } from '../../../components/BaseButton';
import { SwapStepAlert } from '../../components/SwapStepAlert';
import { WalletAddressPreview } from '../../../components/WalletAddressPreview';
import { SwapConfirmations } from '../../components/SwapConfirmations';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { useFromBtcQuote } from './useFromBtcQuote';
import { ImportantNoticeModal } from "../../components/ImportantNoticeModal";
/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCQuoteSummary(props) {
    const page = useFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);
    const stepByStep = page.executionSteps ? (_jsx(StepByStep, { quote: props.quote, steps: page.executionSteps })) : ('');
    //TODO: This should be contained in a standalone component
    const addressContent = useCallback((show) => (_jsxs(_Fragment, { children: [_jsxs(AlertMessage, { variant: "warning", className: "mb-3", children: ["Send ", _jsxs("strong", { children: ["EXACTLY ", props.quote.getInput().toString()] }), " to the address below."] }), _jsx(QRCodeSVG, { value: page.step2paymentWait?.walletDisconnected?.address.hyperlink, size: 240, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                    show(event.target, page.step2paymentWait?.walletDisconnected?.address.value);
                    page.step2paymentWait.walletDisconnected.address.copy();
                } }), _jsx(WalletAddressPreview, { address: page.step2paymentWait?.walletDisconnected?.address.value, chainName: 'Bitcoin', onCopy: page.step2paymentWait?.walletDisconnected?.address.copy }), _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", onClick: page.step2paymentWait?.walletDisconnected?.payWithBitcoinWallet.onClick, children: [_jsx("i", { className: "icon icon-connect" }), _jsx("div", { className: "sc-text", children: "Pay with BTC Wallet" })] }), _jsxs(BaseButton, { variant: "secondary", onClick: page.step2paymentWait?.walletDisconnected?.payWithBrowserWallet.onClick, disabled: page.step2paymentWait?.walletDisconnected?.payWithBrowserWallet.loading, children: [_jsx("i", { className: "icon icon-new-window" }), _jsx("div", { className: "sc-text", children: "Pay via Browser Wallet" })] })] })] })), [page.step2paymentWait?.walletDisconnected]);
    if (page.step1init) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [_jsx(SwapStepAlert, { show: !!page.step1init.error, type: "error", icon: ic_warning, title: page.step1init.error?.title, description: page.step1init.error?.error.message, error: page.step1init.error?.error }), _jsx(SwapForGasAlert, { notEnoughForGas: page.step1init?.additionalGasRequired?.rawAmount, quote: props.quote })] }), _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: page.step1init.init.onClick, disabled: page.step1init.init.disabled, size: "lg", className: "swap-panel__action", children: [page.step1init.init.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Swap"] })] }));
    }
    if (page.step2paymentWait) {
        return (_jsxs(_Fragment, { children: [_jsx(ImportantNoticeModal, { opened: !!page.step2paymentWait.walletDisconnected?.addressCopyWarningModal, close: page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.close, setShowAgain: page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange, text: (_jsxs(_Fragment, { children: ["Make sure you send", ' ', _jsxs("b", { children: ["EXACTLY ", page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.btcAmount.toString()] }), ", as sending a different amount will not be accepted, and you might lose your funds!"] })), buttonText: "Understood, copy address" }), _jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsxs("div", { className: "swap-panel__card__group", children: [page.step2paymentWait.walletConnected ? (_jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", disabled: page.step2paymentWait.walletConnected.payWithBrowserWallet.loading, onClick: page.step2paymentWait.walletConnected.payWithBrowserWallet.onClick, children: [page.step2paymentWait.walletConnected.payWithBrowserWallet.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Pay with", ' ', _jsx("img", { width: 20, height: 20, src: page.step2paymentWait.walletConnected.bitcoinWallet.icon }), ' ', page.step2paymentWait.walletConnected.bitcoinWallet.name] }), _jsx(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", onClick: page.step2paymentWait.walletConnected.useExternalWallet.onClick, children: "Use a QR/wallet address" })] })) : (''), page.step2paymentWait.walletDisconnected ? (_jsx(CopyOverlay, { placement: 'top', children: addressContent })) : ('')] }), _jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: page.step2paymentWait.expiry.remaining, totalTime: page.step2paymentWait.expiry.total, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }) }), _jsx(SwapStepAlert, { show: !!page.step2paymentWait.error, type: "error", icon: ic_warning, title: page.step2paymentWait.error?.title, description: page.step2paymentWait.error?.error.message, error: page.step2paymentWait.error?.error, action: page.step2paymentWait.error?.retry
                                ? {
                                    type: 'button',
                                    text: 'Retry',
                                    onClick: page.step2paymentWait.error?.retry,
                                    variant: 'secondary',
                                }
                                : undefined }), _jsx(ScrollAnchor, { trigger: true })] }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step3awaitingConfirmations) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, page.step3awaitingConfirmations.broadcasting ? (_jsx("div", { className: "swap-panel__card__group", children: _jsxs("div", { className: "d-flex flex-column align-items-center p-2 gap-3", children: [_jsx(Spinner, {}), _jsx("label", { children: "Sending Bitcoin transaction..." })] }) })) : (_jsx(SwapConfirmations, { txData: page.step3awaitingConfirmations.txData }))] }), _jsx(SwapStepAlert, { show: !!page.step3awaitingConfirmations.error, type: "error", icon: ic_warning, title: page.step3awaitingConfirmations.error?.title, description: page.step3awaitingConfirmations.error?.error.message, error: page.step3awaitingConfirmations.error?.error, action: {
                        type: 'button',
                        text: 'Retry',
                        onClick: page.step3awaitingConfirmations.error?.retry,
                        variant: 'secondary',
                    } }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step4claim) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, page.step4claim.waitingForWatchtowerClaim ? (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__estimate", children: _jsx(Spinner, {}) }), _jsx("div", { className: "swap-confirmations__name", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] })) : (_jsxs(_Fragment, { children: [_jsx(SwapStepAlert, { show: !!page.step4claim.error, type: "error", icon: ic_warning, title: page.step4claim.error?.title, description: page.step4claim.error?.error.message, error: page.step4claim.error?.error }), _jsx(SwapStepAlert, { show: true, type: "success", icon: ic_check_circle, title: "Bitcoin transaction confirmed", description: "Claim your payment to finish the swap.", actionElement: _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-step-alert__button", chainId: props.quote?.chainIdentifier, onClick: page.step4claim.claim.onClick, disabled: page.step4claim.claim.disabled, variant: "secondary", children: [page.step4claim.claim.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (_jsx("i", { className: "icon icon-claim" })), "Claim your payment"] }) })] }))] }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step5) {
        return (_jsxs(_Fragment, { children: [page.step5.state !== 'expired' ? (_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapExpiryProgressBar, { show: page.step5.state === 'failed', expired: true, timeRemaining: 0, totalTime: 1, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }), _jsx(SwapStepAlert, { show: page.step5.state === 'success', type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: page.step5.state === 'failed', type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap address expired without receiving the required funds!" })] })) : (''), _jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" })] }));
    }
}
