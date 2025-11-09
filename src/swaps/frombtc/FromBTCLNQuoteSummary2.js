import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { LightningHyperlinkModal } from '../components/LightningHyperlinkModal';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';
import { StepByStep } from '../../components/StepByStep';
import { LightningQR } from '../components/LightningQR';
import { BaseButton } from '../../components/BaseButton';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useFromBtcLnQuote2 } from './useFromBtcLnQuote2';
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNQuoteSummary2(props) {
    const page = useFromBtcLnQuote2(props.quote, props.setAmountLock);
    // Render card content (progress, alerts, etc.)
    const renderCard = () => {
        const isInitiated = !page.step1init;
        if (!isInitiated)
            return null;
        return (_jsxs("div", { className: "swap-panel__card", children: [page.executionSteps && _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps }), _jsx(SwapStepAlert, { show: !!page.step1init?.error, type: "error", icon: ic_warning, title: page.step1init?.error?.title, description: page.step1init?.error?.error.message, error: page.step1init?.error?.error }), page.step2paymentWait?.error && (_jsx(SwapStepAlert, { show: true, type: "error", icon: ic_warning, title: page.step2paymentWait.error.title, description: page.step2paymentWait.error.error.message ||
                        page.step2paymentWait.error.error.toString(), error: page.step2paymentWait.error.error })), page.step2paymentWait?.walletDisconnected && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card__group", children: [_jsx(LightningQR, { quote: props.quote }), _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", onClick: page.step2paymentWait.walletDisconnected.payWithLnWallet.onClick, children: [_jsx("i", { className: "icon icon-connect" }), _jsx("div", { className: "sc-text", children: "Pay with LN Wallet" })] }), _jsxs(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", onClick: page.step2paymentWait.walletDisconnected.payWithWebLn.onClick, children: [_jsx("img", { width: 20, height: 20, src: "/wallets/WebLN-outline.svg", alt: "WebLN" }), "Pay via WebLN"] })] })] }), page.step2paymentWait.walletDisconnected.autoClaim ? (_jsx("div", { className: "swap-panel__card__group", children: _jsxs(Form, { className: "auto-claim", children: [_jsxs("div", { className: "auto-claim__label", children: [_jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx("i", { className: "icon icon-info" }) })] }), _jsx(Form.Check // prettier-ignore
                                    , { id: "autoclaim", type: "switch", onChange: (val) => page.step2paymentWait.walletDisconnected.autoClaim.onChange(val.target.checked), checked: page.step2paymentWait.walletDisconnected.autoClaim.value })] }) })) : null, _jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: page.step2paymentWait.expiry.remaining, totalTime: page.step2paymentWait.expiry.total, show: true, type: "bar", expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Lightning invoice" }) })] })), _jsx(SwapStepAlert, { show: !!page.step3claim?.error, type: "error", icon: ic_warning, title: page.step3claim?.error?.title, description: page.step3claim?.error?.error.message, error: page.step3claim?.error?.error }), _jsx(SwapStepAlert, { show: page.step4?.state === 'success', type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: page.step4?.state === 'failed', type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] }));
    };
    // Render action buttons based on current step
    const renderActions = () => {
        // Step 1: Init
        if (page.step1init) {
            if (page.step1init.invalidSmartChainWallet) {
                return (_jsx(ButtonWithWallet, { chainId: props.quote.chainIdentifier, requiredWalletAddress: props.quote._getInitiator(), size: "lg", className: "swap-panel__action" }));
            }
            return (_jsxs(_Fragment, { children: [_jsx(SwapForGasAlert, { notEnoughForGas: page.step1init.additionalGasRequired?.rawAmount, quote: props.quote }), _jsx(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, className: "swap-panel__action", onClick: page.step1init.init, disabled: !!props.notEnoughForGas, size: "lg", children: "Swap" })] }));
        }
        // Step 2: Payment Wait
        if (page.step2paymentWait) {
            return (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { opened: !!page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal, close: page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.close, setShowHyperlinkWarning: page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.showAgain
                            .onChange }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
        }
        // Step 3: Claim
        if (page.step3claim) {
            return (_jsxs(_Fragment, { children: [_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-panel__action", chainId: props.quote?.chainIdentifier, onClick: page.step3claim.commit.onClick, disabled: page.step3claim.commit.disabled, size: page.step3claim.commit.size, children: [page.step3claim.commit.loading && (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })), page.step3claim.commit.text] }), page.step3claim.claim && (_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, onClick: page.step3claim.claim.onClick, disabled: page.step3claim.claim.disabled, size: page.step3claim.claim.size, className: "swap-panel__action", children: [page.step3claim.claim.loading && (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })), page.step3claim.claim.text] }))] }));
        }
        // Step 4: Completion
        if (page.step4) {
            return (_jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" }));
        }
        return null;
    };
    return (_jsxs(_Fragment, { children: [renderCard(), renderActions(), _jsx(ScrollAnchor, { trigger: page.step1init == null })] }));
}
