import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { SwapConfirmations } from '../components/SwapConfirmations';
import { StepByStep } from '../../components/StepByStep';
import { ErrorAlert } from '../../components/ErrorAlert';
import { BaseButton } from '../../components/BaseButton';
import { useSpvVaultFromBtcQuote } from './useSpvVaultFromBtcQuote';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */
export function SpvVaultFromBTCQuoteSummary(props) {
    const page = useSpvVaultFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card", children: [page.executionSteps ? _jsx(StepByStep, { quote: props.quote, steps: page.executionSteps }) : '', page.step1init ? (_jsx(_Fragment, { children: _jsx(ErrorAlert, { className: "mb-3", title: page.step1init.error?.title, error: page.step1init.error?.error }) })) : (''), (page.step3awaitingConfirmations || page.step4claim) && (_jsx(SwapConfirmations, { txData: page.step3awaitingConfirmations
                            ? {
                                txId: page.step3awaitingConfirmations.txData.txId,
                                confirmations: page.step3awaitingConfirmations.txData.confirmations.actual,
                                confTarget: page.step3awaitingConfirmations.txData.confirmations.required,
                                txEtaMs: page.step3awaitingConfirmations.txData.eta?.millis ?? -1,
                            }
                            : null, isClaimable: !!page.step4claim, claimable: page.step4claim ? !page.step4claim.waitingForWatchtowerClaim : false, chainId: props.quote.chainIdentifier, onClaim: page.step4claim?.claim.onClick, claimLoading: page.step4claim?.claim.loading, claimError: page.step4claim?.error?.error })), page.step5?.state === 'success' ? (_jsx(SwapStepAlert, { type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" })) : (''), page.step5?.state === 'failed' ? (_jsx(SwapStepAlert, { type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap transaction reverted, no funds were sent!" })) : ('')] }), page.step1init && (_jsxs(ButtonWithWallet, { chainId: "BITCOIN", onClick: page.step1init.init?.onClick, className: "swap-panel__action", disabled: page.step1init.init?.disabled, size: "lg", children: [page.step1init.init?.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Pay with ", _jsx("img", { width: 20, height: 20, src: page.step1init.bitcoinWallet?.icon }), ' ', page.step1init.bitcoinWallet?.name] })), page.step5 ? (_jsx(BaseButton, { onClick: props.refreshQuote, className: "swap-panel__action", variant: "primary", size: "large", children: "New quote" })) : ('')] }));
}
