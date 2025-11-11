import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Spinner } from 'react-bootstrap';
import { SwapType, } from '@atomiqlabs/sdk';
import { FEConstants } from '../../FEConstants';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../components/StepByStep';
import { ErrorAlert } from '../../components/ErrorAlert';
import { BaseButton } from '../../components/BaseButton';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { useToBtcQuote } from "./useToBtcQuote";
/*
Steps lightning:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Lightning payment in-flight -> Lightning payment success

Steps on-chain:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Receiving BTC -> BTC received
3. Waiting BTC confirmations -> BTC confirmed
 */
export function ToBTCQuoteSummary(props) {
    const page = useToBtcQuote(props.quote, props.UICallback, props.type, props.balance);
    const stepByStep = page.executionSteps ? _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps }) : '';
    if (page.step1init) {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [_jsx(SwapStepAlert, { show: !!page.step1init.additionalGasRequired, type: "danger", icon: ic_error_outline_outline, title: `Not enough ${page.step1init.additionalGasRequired?.token.ticker} for fees`, description: `You need at least ${page.step1init.additionalGasRequired?.toString()} more to pay for fees and deposits!` }), _jsx(SwapStepAlert, { show: !!page.step1init.error, type: "error", icon: ic_warning, title: page.step1init.error?.title, error: page.step1init.error?.error })] }), _jsxs(ButtonWithWallet, { className: "swap-panel__action", requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: page.step1init.init?.onClick, disabled: page.step1init.init?.disabled, size: "lg", children: [page.step1init.init?.loading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', page.step1init.init?.text] })] }));
    }
    if (page.step2paying) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "swap-panel__card", children: stepByStep }), _jsx(ErrorAlert, { className: "mb-3", title: page.step2paying.error?.title, error: page.step2paying.error?.error }), page.step2paying.error ? (_jsx(Button, { onClick: page.step2paying.error?.retry, variant: "secondary", children: "Retry" })) : ''] }));
    }
    if (page.step3refund) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "swap-panel__card", children: stepByStep }), _jsx(SwapStepAlert, { type: "danger", icon: ic_error_outline_outline, title: "Swap failed", description: "Swap failed, you can refund your prior deposit", actionElement: _jsxs(ButtonWithWallet, { className: "swap-step-alert__button", requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: page.step3refund.refund?.onClick, disabled: page.step3refund.refund?.disabled, variant: "secondary", children: [_jsx("div", { className: "base-button__icon", children: page.step3refund.refund?.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (_jsx("i", { className: 'icon icon-refund' })) }), "Refund"] }) }), _jsx(ErrorAlert, { className: "mb-3", title: page.step3refund.error?.title, error: page.step3refund.error?.error })] }));
    }
    if (page.step4) {
        return (_jsxs(_Fragment, { children: [page.step4.state !== 'expired' ? (_jsx("div", { className: "swap-panel__card", children: stepByStep })) : '', _jsx(SwapStepAlert, { show: page.step4.state === "refunded", type: "info", icon: ic_settings_backup_restore_outline, title: "Funds returning", description: "Funds refunded successfully!" }), _jsx(SwapStepAlert, { show: page.step4.state === "success", type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!", action: props.quote.getType() === SwapType.TO_BTC
                        ? {
                            type: 'link',
                            text: 'View transaction',
                            href: FEConstants.btcBlockExplorer + props.quote.getOutputTxId(),
                        }
                        : undefined }), _jsx(BaseButton, { onClick: props.refreshQuote, variant: "secondary", className: "swap-panel__action", children: "New quote" })] }));
    }
}
