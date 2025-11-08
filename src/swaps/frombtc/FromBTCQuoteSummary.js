import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { AlertMessage } from '../../components/AlertMessage';
import { QRCodeSVG } from 'qrcode.react';
import { FromBTCSwapState } from '@atomiqlabs/sdk';
import { Tokens } from '../../FEConstants';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { CopyOverlay } from '../../components/CopyOverlay';
import { useSwapState } from '../hooks/useSwapState';
import { useAsync } from '../../utils/hooks/useAsync';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';
import { ic_gavel_outline } from 'react-icons-kit/md/ic_gavel_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../components/StepByStep';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { useAbortSignalRef } from '../../utils/hooks/useAbortSignal';
import { OnchainAddressCopyModal } from '../components/OnchainAddressCopyModal';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { ChainDataContext } from '../../wallets/context/ChainDataContext';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { WalletAddressPreview } from '../../components/WalletAddressPreview';
import { SwapConfirmations } from '../components/SwapConfirmations';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */
export function FromBTCQuoteSummary(props) {
    const { disconnectWallet, connectWallet } = useContext(ChainDataContext);
    const bitcoinChainData = useChain('BITCOIN');
    const smartChainWallet = useSmartChainWallet(props.quote, true);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [payBitcoin, payLoading, payTxId, payError] = useAsync(() => props.quote.sendBitcoinTransaction(bitcoinChainData.wallet.instance, props.feeRate === 0 ? null : props.feeRate), [bitcoinChainData.wallet, props.feeRate, props.quote]);
    const [callPayFlag, setCallPayFlag] = useState(false);
    useEffect(() => {
        if (!callPayFlag)
            return;
        setCallPayFlag(false);
        if (!bitcoinChainData.wallet)
            return;
        payBitcoin();
    }, [callPayFlag, bitcoinChainData.wallet, payBitcoin]);
    const isAlreadyClaimable = useMemo(() => (props.quote != null ? props.quote.isClaimable() : false), [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(async () => {
        if (setAmountLockRef.current != null)
            setAmountLockRef.current(true);
        const commitTxId = await props.quote.commit(smartChainWallet.instance).catch((e) => {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
            throw e;
        });
        if (bitcoinChainData.wallet != null)
            payBitcoin();
        return commitTxId;
    }, [props.quote, smartChainWallet, payBitcoin]);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => props.quote.waitForBitcoinTransaction(abortSignalRef.current, null, (txId, confirmations, confirmationTarget, txEtaMs) => {
        if (txId == null) {
            setTxData(null);
            return;
        }
        setTxData({
            txId,
            confirmations,
            confTarget: confirmationTarget,
            txEtaMs,
        });
    }), [props.quote]);
    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return props.quote.claim(smartChainWallet.instance);
    }, [props.quote, smartChainWallet]);
    const textFieldRef = useRef();
    const openModalRef = useRef(null);
    const [txData, setTxData] = useState(null);
    // Helper function to check if error is a user cancellation
    const isUserCancellation = useCallback((error) => {
        if (!error)
            return false;
        const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
        return (errorMessage.includes('user rejected') ||
            errorMessage.includes('user denied') ||
            errorMessage.includes('user cancelled') ||
            errorMessage.includes('user canceled') ||
            errorMessage.includes('transaction rejected') ||
            errorMessage.includes('cancelled by user') ||
            errorMessage.includes('canceled by user') ||
            error?.code === 4001 || // MetaMask user rejection
            error?.code === 'ACTION_REJECTED');
    }, []);
    // Track cancellation states
    const isCommitCancelled = useMemo(() => isUserCancellation(commitError), [commitError, isUserCancellation]);
    const isClaimCancelled = useMemo(() => isUserCancellation(claimError), [claimError, isUserCancellation]);
    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if (state === FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) {
            onWaitForPayment();
        }
        let timer = null;
        if (state === FromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 20 * 1000);
        }
        return () => {
            if (timer != null)
                clearTimeout(timer);
            setClaimable(false);
        };
    }, [state]);
    const hasEnoughBalance = useMemo(() => props.balance == null || props.quote == null
        ? true
        : props.balance >= props.quote.getInput().rawAmount, [props.balance, props.quote]);
    const isQuoteExpired = state === FromBTCSwapState.QUOTE_EXPIRED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && !commitLoading);
    const isCreated = state === FromBTCSwapState.PR_CREATED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && commitLoading);
    const isCommited = state === FromBTCSwapState.CLAIM_COMMITED && txData == null;
    const isReceived = state === (FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) &&
        txData != null;
    const isClaimable = state === FromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === FromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isExpired = state === FromBTCSwapState.EXPIRED && txData == null;
    const isFailed = state === FromBTCSwapState.FAILED;
    const isSuccess = state === FromBTCSwapState.CLAIM_CLAIMED;
    useEffect(() => {
        if (isSuccess ||
            isFailed ||
            isExpired ||
            isQuoteExpired ||
            isCommitCancelled ||
            isClaimCancelled) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isExpired, isQuoteExpired, isCommitCancelled, isClaimCancelled]);
    // Source wallet data (input token - Bitcoin)
    const inputAmount = props.quote.getInput().amount;
    const inputToken = props.quote.getInput().token;
    const inputValue = usePricing(inputAmount, inputToken);
    const sourceWallet = useMemo(() => {
        if (!inputToken)
            return null;
        const chainIcon = '/icons/chains/bitcoin.svg';
        // Get string representation and remove trailing zeros
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
        // Get string representation and remove trailing zeros
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
    /*
      Steps:
      1. Opening swap address -> Swap address opened
      2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
      3. Claim transaction -> Sending claim transaction -> Claim success
       */
    const executionSteps = [
        {
            icon: ic_check_outline,
            text: 'Swap address opened',
            type: 'success',
        },
        { icon: bitcoin, text: 'Bitcoin payment', type: 'disabled' },
        {
            icon: ic_receipt,
            text: 'Claim transaction',
            type: 'disabled',
        },
    ];
    if (isCreated && !commitLoading)
        executionSteps[0] = {
            icon: ic_gavel_outline,
            text: 'Open swap address',
            type: 'loading',
        };
    if (isCreated && commitLoading)
        executionSteps[0] = {
            icon: ic_hourglass_empty_outline,
            text: 'Opening swap address',
            type: 'loading',
        };
    if (isCommitCancelled)
        executionSteps[0] = {
            icon: ic_warning,
            text: 'Transaction didn’t confirm',
            type: 'failed',
        };
    if (isQuoteExpired)
        executionSteps[0] = {
            icon: ic_hourglass_disabled_outline,
            text: 'Quote expired',
            type: 'failed',
        };
    if (isCommited)
        executionSteps[1] = {
            icon: bitcoin,
            text: 'Awaiting bitcoin payment',
            type: 'loading',
        };
    if (isReceived)
        executionSteps[1] = {
            icon: ic_hourglass_top_outline,
            text: 'Awaiting bitcoin payment',
            type: 'loading',
        };
    if (isClaimable || isClaiming || isSuccess)
        executionSteps[1] = {
            icon: ic_check_outline,
            text: 'Bitcoin confirmed',
            type: 'success',
        };
    if (isExpired || isFailed)
        executionSteps[1] = {
            icon: ic_watch_later_outline,
            text: 'Swap expired',
            type: 'failed',
        };
    if (isClaimable)
        executionSteps[2] = {
            icon: ic_receipt,
            text: 'Claim transaction',
            type: 'loading',
        };
    if (isClaiming)
        executionSteps[2] = {
            icon: ic_hourglass_empty_outline,
            text: 'Sending claim transaction',
            type: 'loading',
        };
    if (isClaimCancelled)
        executionSteps[2] = {
            icon: ic_warning,
            text: 'Claim cancelled',
            type: 'failed',
        };
    if (isSuccess)
        executionSteps[2] = {
            icon: ic_check_outline,
            text: 'Claim success',
            type: 'success',
        };
    const [_, setShowCopyWarning, showCopyWarningRef] = useLocalStorage('crossLightning-copywarning', true);
    const addressContent = useCallback((show) => (_jsxs(_Fragment, { children: [_jsxs(AlertMessage, { variant: "warning", className: "mb-3", children: ["Send", ' ', _jsxs("strong", { children: ["EXACTLY ", props.quote.getInput().amount, " ", Tokens.BITCOIN.BTC.ticker] }), ' ', "to the address below."] }), _jsx(QRCodeSVG, { value: props.quote.getHyperlink(), size: 240, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                    show(event.target, props.quote.getAddress(), textFieldRef.current?.input?.current);
                } }), _jsx(WalletAddressPreview, { address: props.quote.getAddress(), chainName: getChainName(inputToken?.ticker), onCopy: () => {
                    if (showCopyWarningRef.current)
                        setTimeout(openModalRef.current, 100);
                } }), _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", onClick: () => {
                            window.location.href = props.quote.getHyperlink();
                        }, children: [_jsx("i", { className: "icon icon-connect" }), _jsx("div", { className: "sc-text", children: "Pay with BTC Wallet" })] }), _jsxs(BaseButton, { variant: "secondary", onClick: () => {
                            connectWallet('BITCOIN').then((success) => {
                                //Call payBitcoin on next state update
                                if (success)
                                    setCallPayFlag(true);
                            });
                        }, children: [_jsx("i", { className: "icon icon-new-window" }), _jsx("div", { className: "sc-text", children: "Pay via Browser Wallet" })] })] })] })), [props.quote, inputToken]);
    return (_jsxs(_Fragment, { children: [_jsx(OnchainAddressCopyModal, { openRef: openModalRef, amountBtc: props.quote?.getInput()?.amount, setShowCopyWarning: setShowCopyWarning }), _jsxs("div", { className: "swap-panel__card", children: [isInitiated ? (_jsx(StepByStep, { steps: executionSteps, sourceWallet: sourceWallet, destinationWallet: destinationWallet })) : null, _jsx(SwapStepAlert, { show: !!commitError, type: "error", icon: ic_warning, title: "Swap initialization error", description: commitError?.message || commitError?.toString(), error: commitError }), isCreated && hasEnoughBalance ? (smartChainWallet === undefined ? null : (_jsx(SwapForGasAlert, { notEnoughForGas: props.notEnoughForGas, quote: props.quote }))) : null, isCommited ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "swap-panel__card__group", children: bitcoinChainData.wallet != null ? (_jsx(_Fragment, { children: _jsx("div", { className: "d-flex flex-column align-items-center justify-content-center", children: payTxId != null ? (_jsxs("div", { className: "d-flex flex-column align-items-center p-2 gap-3", children: [_jsx(Spinner, {}), _jsx("label", { children: "Sending Bitcoin transaction..." })] })) : (_jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", disabled: payLoading, onClick: payBitcoin, children: [payLoading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Pay with", ' ', _jsx("img", { width: 20, height: 20, src: bitcoinChainData.wallet?.icon }), ' ', bitcoinChainData.wallet?.name] }), _jsx(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", onClick: () => {
                                                        disconnectWallet('BITCOIN');
                                                    }, children: "Use a QR/wallet address" })] })) }) })) : (_jsx(CopyOverlay, { placement: 'top', children: addressContent })) }), _jsx("div", { className: "swap-panel__card__group", children: _jsx(SwapExpiryProgressBar, { timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, type: "bar", expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" }) })] })) : (''), (isReceived || isClaimable || isClaiming) && (_jsx(SwapConfirmations, { txData: txData, isClaimable: isClaimable || isClaiming, claimable: claimable || isAlreadyClaimable, chainId: props.quote.chainIdentifier, onClaim: onClaim, claimLoading: claimLoading, claimError: claimError })), _jsx(SwapStepAlert, { show: isSuccess, type: "success", icon: ic_check_circle, title: "Swap success", description: "Your swap was executed successfully!" }), isExpired ? (_jsx(SwapExpiryProgressBar, { expired: true, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, expiryText: "Swap address expired, please do not send any funds!", quoteAlias: "Swap address" })) : null, _jsx(SwapStepAlert, { show: isFailed, type: "danger", icon: ic_warning, title: "Swap failed", description: "Swap address expired without receiving the required funds!" })] }), isCreated && hasEnoughBalance && !commitLoading ? (smartChainWallet === undefined ? (_jsx(ButtonWithWallet, { chainId: props.quote.chainIdentifier, requiredWalletAddress: props.quote._getInitiator(), size: "lg", className: "swap-panel__action" })) : (_jsx(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: onCommit, disabled: !!props.notEnoughForGas || !hasEnoughBalance, size: "lg", className: "swap-panel__action", children: "Swap" }))) : null, isQuoteExpired || isExpired || isFailed || isSuccess ? (_jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New quote" })) : null, isCommited ? (_jsx(SwapStepAlert, { show: !!payError, type: "error", icon: ic_warning, title: "Sending BTC failed", description: payError?.message || payError?.toString(), error: payError, className: "mb-2" })) : null, isCommited &&
                !isReceived &&
                !isClaimable &&
                !isClaiming &&
                (waitPaymentError == null ? (_jsx(BaseButton, { onClick: props.abortSwap, variant: "danger", className: "swap-panel__action is-large", children: "Abort swap" })) : (_jsx(SwapStepAlert, { show: !!waitPaymentError, type: "error", icon: ic_warning, title: "Wait payment error", description: waitPaymentError?.message || waitPaymentError?.toString(), error: waitPaymentError, action: {
                        type: 'button',
                        text: 'Retry',
                        onClick: onWaitForPayment,
                        variant: 'secondary',
                    } }))), _jsx(ScrollAnchor, { trigger: isCommited })] }));
}
