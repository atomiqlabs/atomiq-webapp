import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from "../../../swaps/StepByStep";
import { SwapExpiryProgressBar } from "../../../swaps/SwapExpiryProgressBar";
import { SwapStepAlert } from "../../../swaps/SwapStepAlert";
import { BaseButton } from "../../../BaseButton";
import { ScrollAnchor } from "../../../ScrollAnchor";
import { useTrustedFromBtcLnQuote } from "../../../../hooks/swaps/useTrustedFromBtcLnQuote";
import { ConnectedWalletPayButtons } from "../../../swaps/ConnectedWalletPayButtons";
import { DisconnectedWalletQrAndAddress } from "../../../swaps/DisconnectedWalletQrAndAddress";
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function TrustedFromBTCLNSwapPanel(props) {
    const page = useTrustedFromBtcLnQuote(props.quote);
    const stepByStep = page.executionSteps ? _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps }) : '';
    if (page.step1paymentWait) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step1paymentWait.error, type: page.step1paymentWait.error?.type, icon: ic_warning, title: page.step1paymentWait.error?.title, error: page.step1paymentWait.error?.error, actionElement: page.step1paymentWait.error?.retry && (_jsxs(BaseButton, { className: "swap-step-alert__button", onClick: page.step1paymentWait.error?.retry, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] })) }), page.step1paymentWait.walletConnected && (_jsx(ConnectedWalletPayButtons, { wallet: page.step1paymentWait.walletConnected.lightningWallet, payWithBrowserWallet: page.step1paymentWait.walletConnected.payWithWebLn, useExternalWallet: page.step1paymentWait.walletConnected.useExternalWallet })), page.step1paymentWait?.walletDisconnected && (_jsx(DisconnectedWalletQrAndAddress, { address: {
                                ...page.step1paymentWait.walletDisconnected.address,
                                description: 'Lightning network invoice'
                            }, payWithDeeplink: {
                                ...page.step1paymentWait.walletDisconnected.payWithLnWallet,
                                text: 'Pay with LN wallet'
                            }, payWithBrowserWallet: {
                                ...page.step1paymentWait.walletDisconnected.payWithWebLn,
                                text: (_jsxs(_Fragment, { children: [_jsx("img", { className: "mr-2", width: 20, height: 20, src: "/wallets/WebLN-outline.svg", alt: "WebLN" }), "Pay with WebLN"] }))
                            } })), page.step1paymentWait?.walletDisconnected || page.step1paymentWait?.walletConnected ? (_jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: page.step1paymentWait.expiry.remaining, totalTime: page.step1paymentWait.expiry.total, show: true, expiryText: "Lighnting network invoice expired, please do not send any funds!", quoteAlias: "Lightning invoice" }) })) : ''] }), _jsx(ScrollAnchor, { trigger: !!page.step1paymentWait.walletDisconnected }), _jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })] }));
    }
    if (page.step2receivingFunds) {
        return (_jsx(_Fragment, { children: _jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: !!page.step2receivingFunds.error, type: page.step2receivingFunds.error?.type, icon: ic_warning, title: page.step2receivingFunds.error?.title, error: page.step2receivingFunds.error?.error, actionElement: page.step2receivingFunds.error?.retry && (_jsxs(BaseButton, { className: "swap-step-alert__button", onClick: page.step2receivingFunds.error?.retry, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] })) })] }) }));
    }
    if (page.step3) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapStepAlert, { show: page.step3.state === 'success', type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: page.step3.state === 'failed', type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap HTLC expired, your lightning payment will be refunded shortly!" }), _jsx(SwapStepAlert, { show: page.step3.state === 'expired', type: "danger", icon: ic_warning, title: "Swap expired", description: "Swap has expired without being paid!" })] }), _jsx(BaseButton, { onClick: page.step3.state === 'success' ? props.continue : props.refreshQuote, variant: "primary", className: "swap-panel__action", children: page.step3.state === 'success' ? 'Continue' : 'New quote' })] }));
    }
}
