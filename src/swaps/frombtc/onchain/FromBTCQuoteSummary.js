import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../../components/ScrollAnchor';
import { SwapExpiryProgressBar } from '../../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../../components/SwapForGasAlert';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../../components/StepByStep';
import { BaseButton } from '../../../components/BaseButton';
import { SwapStepAlert } from '../../components/SwapStepAlert';
import { SwapConfirmations } from '../../components/SwapConfirmations';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { useFromBtcQuote } from './useFromBtcQuote';
import { ImportantNoticeModal } from "../../components/ImportantNoticeModal";
import { ConnectedWalletPayButtons } from "../../components/ConnectedWalletPayButtons";
import { DisconnectedWalletQrAndAddress } from "../../components/DisconnectedWalletQrAndAddress";
/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCQuoteSummary(props) {
    const page = useFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);
    const gasAlert = _jsx(SwapForGasAlert, { notEnoughForGas: page.additionalGasRequired, quote: props.quote });
    const stepByStep = page.executionSteps && _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps });
    if (page.step1init) {
        return (_jsxs(_Fragment, { children: [_jsx(SwapStepAlert, { show: !!page.step1init.error, type: "error", icon: ic_warning, title: page.step1init.error?.title, error: page.step1init.error?.error }), gasAlert, !!page.step1init.init && (_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: page.step1init.init.onClick, disabled: page.step1init.init.disabled, size: "lg", className: "swap-panel__action", children: [page.step1init.init.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Swap"] }))] }));
    }
    if (page.step2paymentWait) {
        return (_jsxs(_Fragment, { children: [_jsx(ImportantNoticeModal, { opened: !!page.step2paymentWait.walletDisconnected?.addressCopyWarningModal, close: page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.close, setShowAgain: page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange, text: (_jsxs(_Fragment, { children: ["Make sure you send", ' ', _jsxs("b", { children: ["EXACTLY ", page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.btcAmount.toString()] }), ", as sending a different amount will not be accepted, and you might lose your funds!"] })), buttonText: "Understood, copy address" }), _jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step2paymentWait.error, type: page.step2paymentWait.error?.type, title: page.step2paymentWait.error?.title, error: page.step2paymentWait.error?.error, actionElement: page.step2paymentWait.error?.retry && (_jsxs(BaseButton, { className: "swap-step-alert__button", onClick: page.step2paymentWait.error?.retry, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] })) }), page.step2paymentWait.walletConnected ? (_jsx(ConnectedWalletPayButtons, { wallet: page.step2paymentWait.walletConnected.bitcoinWallet, payWithBrowserWallet: page.step2paymentWait.walletConnected.payWithBrowserWallet, useExternalWallet: page.step2paymentWait.walletConnected.useExternalWallet })) : (''), page.step2paymentWait.walletDisconnected ? (_jsx(DisconnectedWalletQrAndAddress, { address: {
                                ...page.step2paymentWait.walletDisconnected.address,
                                description: 'Bitcoin wallet address'
                            }, payWithDeeplink: {
                                ...page.step2paymentWait.walletDisconnected.payWithBitcoinWallet,
                                text: 'Pay with BTC wallet'
                            }, payWithBrowserWallet: {
                                ...page.step2paymentWait.walletDisconnected.payWithBrowserWallet,
                                text: 'Pay with browser wallet'
                            }, alert: (_jsxs(_Fragment, { children: ["Send ", _jsxs("strong", { children: ["EXACTLY ", props.quote.getInput().toString()] }), " to the address below."] })) })) : (''), page.step2paymentWait?.walletDisconnected || page.step2paymentWait?.walletConnected ? (_jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: page.step2paymentWait.expiry.remaining, totalTime: page.step2paymentWait.expiry.total, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }) })) : '', _jsx(ScrollAnchor, { trigger: true })] }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step3awaitingConfirmations) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step3awaitingConfirmations.error, type: "warning", icon: ic_warning, title: page.step3awaitingConfirmations.error?.title, error: page.step3awaitingConfirmations.error?.error, actionElement: page.step3awaitingConfirmations.error?.retry && (_jsxs(BaseButton, { className: "swap-step-alert__button", onClick: page.step3awaitingConfirmations.error?.retry, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] })) }), page.step3awaitingConfirmations.broadcasting ? (_jsx("div", { className: "swap-panel__card__group", children: _jsxs("div", { className: "d-flex flex-column align-items-center p-2 gap-3", children: [_jsx(Spinner, {}), _jsx("label", { children: "Sending Bitcoin transaction..." })] }) })) : (_jsx(SwapConfirmations, { txData: page.step3awaitingConfirmations.txData }))] }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step4claim) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, page.step4claim.waitingForWatchtowerClaim ? (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__estimate", children: _jsx(Spinner, {}) }), _jsx("div", { className: "swap-confirmations__name", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] })) : (_jsxs(_Fragment, { children: [_jsx(SwapStepAlert, { show: !!page.step4claim.error, type: "error", icon: ic_warning, title: page.step4claim.error?.title, error: page.step4claim.error?.error }), _jsx(SwapStepAlert, { show: true, type: "success", icon: ic_check_circle, title: "Bitcoin transaction confirmed", description: "Claim your payment to finish the swap.", actionElement: _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-step-alert__button", chainId: props.quote?.chainIdentifier, onClick: page.step4claim.claim.onClick, disabled: page.step4claim.claim.disabled, variant: "secondary", children: [page.step4claim.claim.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (_jsx("i", { className: "icon icon-claim" })), "Claim your payment"] }) })] }))] }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step5) {
        return (_jsxs(_Fragment, { children: [page.step5.state !== 'expired' ? (_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapExpiryProgressBar, { show: page.step5.state === 'failed', expired: true, timeRemaining: 0, totalTime: 1, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }), _jsx(SwapStepAlert, { show: page.step5.state === 'success', type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: page.step5.state === 'failed', type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap address expired without receiving the required funds!" })] })) : (''), gasAlert, _jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" })] }));
    }
}
