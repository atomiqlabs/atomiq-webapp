import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useContext, useEffect } from 'react';
import { SwapperContext } from '../context/SwapperContext';
import { useAnchorNavigate } from '../hooks/navigation/useAnchorNavigate';
import { useAsync } from '../hooks/utils/useAsync';
import { useChain } from '../hooks/chains/useChain';
import { TrustedFromBTCLNSwapPanel } from '../components/swappanels/frombtc/trusted/TrustedFromBTCLNSwapPanel';
import { SwapStepAlert } from '../components/swaps/SwapStepAlert';
import { BaseButton } from '../components/common/BaseButton';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
const defaultSwapAmount = '12500000';
export function SwapForGas() {
    const { swapper } = useContext(SwapperContext);
    const navigate = useNavigate();
    const navigateHref = useAnchorNavigate();
    const { state } = useLocation();
    const chainId = state?.chainId ?? 'SOLANA';
    const nativeCurrency = swapper == null ? null : swapper.Utils.getNativeToken(chainId);
    const amount = BigInt(state?.amount ?? defaultSwapAmount);
    const outputChainData = useChain(nativeCurrency);
    const [createSwap, loading, swapData, error] = useAsync(() => {
        if (swapper == null || outputChainData?.wallet == null)
            return null;
        return swapper.createTrustedLNForGasSwap(chainId, outputChainData.wallet.instance.getAddress(), amount);
    }, [swapper, outputChainData?.wallet, chainId]);
    useEffect(() => {
        createSwap();
    }, [createSwap]);
    const onContinue = useCallback(() => {
        navigate(state.returnPath ?? '/');
    }, [swapData]);
    return (_jsx(_Fragment, { children: _jsx("div", { className: "d-flex flex-column align-items-center text-white", children: _jsxs("div", { className: "swap-panel", children: [_jsxs("div", { className: "alert-message is-info mb-3", children: [_jsx("i", { className: "alert-message__icon icon icon-info" }), _jsxs("div", { className: "alert-message__body", children: ["Swap for gas is a trusted service allowing you to swap BTCLN to", ' ', nativeCurrency?.ticker, ", so you can then cover the gas fees of a trustless atomiq swap. Note that this is a trusted service and is therefore only used for small amounts! You can read more about it in our", ' ', _jsx("a", { href: "/faq?tabOpen=11", onClick: navigateHref, children: "FAQ" }), "."] })] }), _jsxs("div", { className: "swap-panel__card", children: [_jsx(SwapStepAlert, { className: "mt-0", show: !!error, type: "error", icon: ic_warning, title: "Swap cannot be created", error: error, actionElement: _jsxs(BaseButton, { className: "swap-step-alert__button", onClick: createSwap, variant: "secondary", children: [_jsx("i", { className: "icon icon-retry" }), "Retry"] }) }), loading ? (_jsxs("div", { className: "d-flex flex-column align-items-center p-2 gap-3", children: [_jsx(Spinner, {}), _jsx("label", { children: "Creating gas swap..." })] })) : ('')] }), swapData != null ? (_jsx(TrustedFromBTCLNSwapPanel, { quote: swapData, refreshQuote: createSwap, abortSwap: onContinue, continue: onContinue })) : ('')] }) }) }));
}
