import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { SwapConfirmations } from '../../components/SwapConfirmations';
import { StepByStep } from '../../../components/StepByStep';
import { ErrorAlert } from '../../../components/ErrorAlert';
import { BaseButton } from '../../../components/BaseButton';
import { useSpvVaultFromBtcQuote } from './useSpvVaultFromBtcQuote';
import { SwapStepAlert } from '../../components/SwapStepAlert';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */
export function SpvVaultFromBTCQuoteSummary(props) {
    const page = useSpvVaultFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);
    const stepByStep = page.executionSteps ? (_jsx(StepByStep, { quote: props.quote, steps: page.executionSteps })) : ('');
    if (page.step1init) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(ErrorAlert, { className: "mb-3", title: page.step1init.error?.title, error: page.step1init.error?.error })] }), _jsxs(ButtonWithWallet, { chainId: "BITCOIN", onClick: page.step1init.init?.onClick, className: "swap-panel__action", disabled: page.step1init.init?.disabled, size: "lg", children: [page.step1init.init?.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Pay with ", _jsx("img", { width: 20, height: 20, src: page.step1init.bitcoinWallet?.icon }), ' ', page.step1init.bitcoinWallet?.name] })] }));
    }
    if (page.step2broadcasting) {
        return _jsx("div", { className: "swap-panel__card", children: stepByStep });
    }
    if (page.step3awaitingConfirmations) {
        return (_jsxs("div", { className: "swap-panel__card", children: [stepByStep, _jsx(SwapConfirmations, { txData: page.step3awaitingConfirmations.txData })] }));
    }
    if (page.step4claim) {
        return (_jsxs("div", { className: "swap-panel__card", children: [stepByStep, page.step4claim.waitingForWatchtowerClaim ? (_jsxs("div", { className: "swap-confirmations", children: [_jsx("div", { className: "swap-confirmations__estimate", children: _jsx(Spinner, {}) }), _jsx("div", { className: "swap-confirmations__name", children: "Transaction received & confirmed, waiting for claim by watchtowers..." })] })) : (_jsxs(_Fragment, { children: [_jsx(SwapStepAlert, { show: !!page.step4claim.error, type: "error", icon: ic_warning, title: page.step4claim.error?.title, description: page.step4claim.error?.error.message, error: page.step4claim.error?.error }), _jsx(SwapStepAlert, { show: true, type: "success", icon: ic_check_circle, title: "Bitcoin transaction confirmed", description: "Claim your payment to finish the swap.", actionElement: _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-step-alert__button", chainId: props.quote?.chainIdentifier, onClick: page.step4claim.claim.onClick, disabled: page.step4claim.claim.disabled, variant: "secondary", children: [page.step4claim.claim.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (_jsx("i", { className: "icon icon-claim" })), "Claim your payment"] }) })] }))] }));
    }
    if (page.step5) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [page.step5.state !== 'expired' ? stepByStep : '', page.step5.state === 'success' ? (_jsx(SwapStepAlert, { type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" })) : (''), page.step5.state === 'failed' ? (_jsx(SwapStepAlert, { type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap transaction reverted, no funds were sent!" })) : ('')] }), _jsx(BaseButton, { onClick: props.refreshQuote, className: "swap-panel__action", variant: "primary", size: "large", children: "New quote" })] }));
    }
}
