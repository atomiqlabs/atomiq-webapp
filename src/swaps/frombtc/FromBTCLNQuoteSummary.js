import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { FromBTCLNSwapState } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { LightningHyperlinkModal } from '../components/LightningHyperlinkModal';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';
import { StepByStep } from '../../components/StepByStep';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { LightningQR } from '../components/LightningQR';
import { useFromBtcLnQuote } from './useFromBtcLnQuote';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCLNQuoteSummary(props) {
    const lightningWallet = useChain('LIGHTNING')?.wallet;
    const smartChainWallet = useSmartChainWallet(props.quote, true);
    const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [autoClaim, setAutoClaim] = useLocalStorage('crossLightning-autoClaim', false);
    const [showHyperlinkWarning, setShowHyperlinkWarning] = useLocalStorage('crossLightning-showHyperlinkWarning', true);
    const [initClicked, setInitClicked] = useState(false);
    const openModalRef = useRef(null);
    const onHyperlink = useCallback(() => {
        if (showHyperlinkWarning) {
            openModalRef.current();
        }
        else {
            window.location.href = props.quote.getHyperlink();
        }
    }, [showHyperlinkWarning, props.quote]);
    const { waitForPayment, onCommit, onClaim, paymentWaiting, committing, claiming, paymentError, commitError, claimError, isQuoteExpired, isQuoteExpiredClaim, isFailed, isCreated, isClaimCommittable, isClaimClaimable, isClaimable, isSuccess, executionSteps, } = useFromBtcLnQuote(props.quote, props.setAmountLock);
    // Source wallet data (input token - Lightning)
    const inputAmount = props.quote.getInput().amount;
    const inputToken = props.quote.getInput().token;
    const inputValue = usePricing(inputAmount, inputToken);
    const sourceWallet = useMemo(() => {
        if (!inputToken)
            return null;
        const chainIcon = '/icons/chains/bitcoin.svg';
        const amountStr = props.quote.getInput().toString();
        const [numPart, tickerPart] = amountStr.split(' ');
        const cleanedAmount = parseFloat(numPart).toString();
        return {
            icon: TokenIcons[inputToken.ticker],
            chainIcon,
            amount: `${cleanedAmount} ${tickerPart}`,
            dollarValue: inputValue ? `$${inputValue.toFixed(2)}` : undefined,
        };
    }, [inputToken, inputAmount, inputValue]);
    // Helper function to map token ticker to full chain name
    const getChainName = (ticker) => {
        if (!ticker)
            return 'Bitcoin';
        const chainNames = {
            BTC: 'Bitcoin',
            ETH: 'Ethereum',
            SOL: 'Solana',
            USDC: 'USDC',
            USDT: 'USDT',
        };
        return chainNames[ticker] || ticker;
    };
    // Destination wallet data (output token)
    const outputAmount = props.quote.getOutput().amount;
    const outputToken = props.quote.getOutput().token;
    const outputValue = usePricing(outputAmount, outputToken);
    const outputAddress = props.quote.getOutputAddress();
    const destinationWallet = useMemo(() => {
        if (!outputToken)
            return null;
        const chainIcon = props.quote.chainIdentifier?.includes('SOLANA')
            ? '/icons/chains/solana.svg'
            : props.quote.chainIdentifier?.includes('STARKNET')
                ? '/icons/chains/STARKNET.svg'
                : undefined;
        const amountStr = props.quote.getOutput().toString();
        const [numPart, tickerPart] = amountStr.split(' ');
        const cleanedAmount = parseFloat(numPart).toString();
        return {
            icon: TokenIcons[outputToken.ticker],
            chainIcon,
            amount: `${cleanedAmount} ${tickerPart}`,
            dollarValue: outputValue ? `$${outputValue.toFixed(2)}` : undefined,
            address: outputAddress,
            chainName: getChainName(outputToken.ticker),
        };
    }, [outputToken, outputAmount, outputValue, outputAddress, props.quote.chainIdentifier]);
    useEffect(() => {
        if (props.quote != null &&
            props.quote.isInitiated() &&
            props.quote.state === FromBTCLNSwapState.PR_CREATED) {
            waitForPayment();
        }
    }, [props.quote]);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_PAID) {
            if (autoClaim || lightningWallet != null)
                onCommit(true).then(() => {
                    if (!canClaimInOneShot)
                        onClaim();
                });
        }
    }, [state]);
    return (_jsxs(_Fragment, { children: [isInitiated ? (_jsxs("div", { className: "swap-panel__card", children: [_jsx(StepByStep, { quote: props.quote, steps: executionSteps }), _jsx(SwapStepAlert, { show: !!paymentError, type: "error", icon: ic_warning, title: "Swap initialization error", description: paymentError?.message || paymentError?.toString(), error: paymentError }), isCreated && paymentWaiting ? (_jsxs(_Fragment, { children: [_jsx(LightningQR, { quote: props.quote, payInstantly: initClicked }), _jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: true, type: "bar", expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Lightning invoice" }) })] })) : null, _jsx(SwapStepAlert, { show: !!(commitError || claimError), type: "error", icon: ic_warning, title: 'Swap ' +
                            (canClaimInOneShot || claimError != null ? 'claim' : ' claim initialization') +
                            ' error', description: (commitError ?? claimError)?.message || (commitError ?? claimError)?.toString(), error: commitError ?? claimError }), _jsx(SwapStepAlert, { show: isSuccess, type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), _jsx(SwapStepAlert, { show: isFailed, type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] })) : null, isCreated && !paymentWaiting ? (smartChainWallet === undefined ? (_jsx(ButtonWithWallet, { className: "swap-panel__action", chainId: props.quote.chainIdentifier, requiredWalletAddress: props.quote._getInitiator(), size: "lg" })) : (_jsxs(_Fragment, { children: [_jsx(LightningHyperlinkModal, { openRef: openModalRef, hyperlink: props.quote.getHyperlink(), setShowHyperlinkWarning: setShowHyperlinkWarning }), _jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }), _jsx(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, className: "swap-panel__action", onClick: () => {
                            setInitClicked(true);
                            waitForPayment();
                        }, disabled: !!props.notEnoughForGas, size: "lg", children: "Swap" })] }))) : null, isCreated && paymentWaiting ? (_jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })) : null, isClaimable ? (_jsxs(_Fragment, { children: [_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), className: "swap-panel__action", chainId: props.quote?.chainIdentifier, onClick: () => onCommit(), disabled: committing || (!canClaimInOneShot && !isClaimCommittable), size: canClaimInOneShot ? 'lg' : isClaimCommittable ? 'lg' : 'sm', children: [committing ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', canClaimInOneShot
                                ? 'Finish swap (claim funds)'
                                : !isClaimCommittable
                                    ? '1. Initialized'
                                    : committing
                                        ? '1. Initializing...'
                                        : '1. Finish swap (initialize)'] }), !canClaimInOneShot ? (_jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote?.chainIdentifier, onClick: () => onClaim(), disabled: claiming || !isClaimClaimable, size: isClaimClaimable ? 'lg' : 'sm', className: "swap-panel__action", children: [claiming ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', claiming ? '2. Claiming funds...' : '2. Finish swap (claim funds)'] })) : null] })) : null, isQuoteExpired || isFailed || isSuccess ? (_jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" })) : null, _jsx(ScrollAnchor, { trigger: isInitiated })] }));
}
