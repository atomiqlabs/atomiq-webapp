import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useFromBtcLnQuote } from "../../../../hooks/swaps/useFromBtcLnQuote";
import { SwapForGasAlert } from "../../../swaps/SwapForGasAlert";
import { StepByStep } from "../../../swaps/StepByStep";
import { ButtonWithWallet } from "../../../wallets/ButtonWithWallet";
import { ImportantNoticeModal } from "../../../swaps/ImportantNoticeModal";
import { SwapStepAlert } from "../../../swaps/SwapStepAlert";
import { BaseButton } from "../../../BaseButton";
import { ConnectedWalletPayButtons } from "../../../swaps/ConnectedWalletPayButtons";
import { DisconnectedWalletQrAndAddress } from "../../../swaps/DisconnectedWalletQrAndAddress";
import { SwapExpiryProgressBar } from "../../../swaps/SwapExpiryProgressBar";
import { ScrollAnchor } from "../../../ScrollAnchor";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNSwapPanel(props) {
    const page = useFromBtcLnQuote(props.quote, props.UICallback);
    const gasAlert = _jsx(SwapForGasAlert, { notEnoughForGas: page.additionalGasRequired, quote: props.quote });
    const stepByStep = page.executionSteps ? _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps }) : '';
    if (page.step1init) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "swap-panel__card", children: stepByStep }), gasAlert, !!page.step1init.init && _jsx(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, className: "swap-panel__action", onClick: page.step1init.init?.onClick, disabled: page.step1init.init?.disabled, size: "lg", children: "Swap" })] }));
    }
    if (page.step2paymentWait) {
        return (_jsxs(_Fragment, { children: [_jsx(ImportantNoticeModal, { opened: !!page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal, close: page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.close, setShowAgain: page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.showAgain
                        .onChange, text: (_jsxs(_Fragment, { children: ["The payment will not succeed unless you", ' ', _jsx("strong", { children: "return to the web app and claim the swap." })] })), buttonText: "Understood, pay with LN wallet" }), _jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step2paymentWait.error, type: page.step2paymentWait.error?.type, icon: ic_warning, title: page.step2paymentWait.error?.title, error: page.step2paymentWait.error?.error, actionElement: page.step2paymentWait.error?.retry && (_jsxs(BaseButton, { className: "swap-step-alert__button", onClick: page.step2paymentWait.error?.retry, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] })) }), page.step2paymentWait.walletConnected && (_jsx(ConnectedWalletPayButtons, { wallet: page.step2paymentWait.walletConnected.lightningWallet, payWithBrowserWallet: page.step2paymentWait.walletConnected.payWithWebLn, useExternalWallet: page.step2paymentWait.walletConnected.useExternalWallet })), page.step2paymentWait?.walletDisconnected && (_jsx(DisconnectedWalletQrAndAddress, { address: {
                                ...page.step2paymentWait.walletDisconnected.address,
                                description: 'Lightning network invoice'
                            }, payWithDeeplink: {
                                ...page.step2paymentWait.walletDisconnected.payWithLnWallet,
                                text: 'Pay with LN wallet'
                            }, payWithBrowserWallet: {
                                ...page.step2paymentWait.walletDisconnected.payWithWebLn,
                                text: (_jsxs(_Fragment, { children: [_jsx("img", { className: "mr-2", width: 20, height: 20, src: "/wallets/WebLN-outline.svg", alt: "WebLN" }), "Pay with WebLN"] }))
                            }, autoClaim: page.step2paymentWait.walletDisconnected.autoClaim, nfcScanning: page.step2paymentWait.walletDisconnected.nfcScanning })), page.step2paymentWait?.walletDisconnected || page.step2paymentWait?.walletConnected ? (_jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: page.step2paymentWait.expiry.remaining, totalTime: page.step2paymentWait.expiry.total, show: true, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Lightning invoice" }) })) : ''] }), _jsx(ScrollAnchor, { trigger: !!page.step2paymentWait.walletDisconnected }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step3claim) {
        return (_jsx(_Fragment, { children: _jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step3claim.error, type: "error", icon: ic_warning, title: page.step3claim.error?.title, error: page.step3claim.error?.error }), _jsx(SwapStepAlert, { show: true, type: "success", icon: ic_check_circle, title: "Lightning network payment received", description: "Claim your payment to finish the swap.", actionElement: _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-step-alert__button", chainId: props.quote?.chainIdentifier, onClick: page.step3claim.commit.onClick, disabled: page.step3claim.commit.disabled, variant: "secondary", children: [page.step3claim.commit.loading
                                    ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })
                                    : _jsx("i", { className: "icon icon-claim" }), "Claim your payment"] }) })] }) }));
    }
    if (page.step4) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [page.step4.state !== "expired_uninitialized" ? stepByStep : '', _jsx(SwapStepAlert, { show: page.step4?.state === 'success', type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: page.step4?.state === 'failed', type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap HTLC expired, your lightning payment will be refunded shortly!" }), _jsx(SwapStepAlert, { show: page.step4?.state === 'expired', type: "danger", icon: ic_warning, title: "Swap expired", description: page.step4?.expiryMessage })] }), gasAlert, _jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" })] }));
    }
}
