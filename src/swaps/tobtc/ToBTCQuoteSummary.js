import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect, useMemo } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { SwapType, ToBTCLNSwap, ToBTCSwapState, toHumanReadableString, } from '@atomiqlabs/sdk';
import { FEConstants } from '../../FEConstants';
import { SwapsContext } from '../context/SwapsContext';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { useAsync } from '../../utils/hooks/useAsync';
import { useAbortSignalRef } from '../../utils/hooks/useAbortSignal';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ic_play_circle_outline } from 'react-icons-kit/md/ic_play_circle_outline';
import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_cancel_outline } from 'react-icons-kit/md/ic_cancel_outline';
import { StepByStep } from '../../components/StepByStep';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useWithAwait } from '../../utils/hooks/useWithAwait';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import Icon from 'react-icons-kit';
import { BaseButton } from '../../components/BaseButton';
import { useCallback } from 'react';
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
    const { swapper } = useContext(SwapsContext);
    const wallet = useSmartChainWallet(props.quote);
    const signer = wallet?.address === props.quote._getInitiator() ? wallet.instance : null;
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
    const [nonCustodialWarning, confidenceWarning] = useMemo(() => {
        if (props.quote instanceof ToBTCLNSwap) {
            return [props.quote.isPayingToNonCustodialWallet(), props.quote.willLikelyFail()];
        }
        return [false, false];
    }, [props.quote]);
    const setAmountLockRef = useStateRef(props.setAmountLock);
    // Helper function to check if error is a user cancellation
    const isUserCancellation = useCallback((error) => {
        if (!error)
            return false;
        const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
        const isCancelled = errorMessage.includes('user rejected') ||
            errorMessage.includes('user denied') ||
            errorMessage.includes('user cancelled') ||
            errorMessage.includes('user canceled') ||
            errorMessage.includes('transaction rejected') ||
            errorMessage.includes('cancelled by user') ||
            errorMessage.includes('canceled by user') ||
            error?.code === 4001 || // MetaMask user rejection
            error?.code === 'ACTION_REJECTED';
        if (isCancelled) {
            console.log('🚫 CANCELLED DETECTED:', error?.message || error?.toString(), error);
        }
        return isCancelled;
    }, []);
    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync((skipChecks) => {
        if (setAmountLockRef.current)
            setAmountLockRef.current(true);
        return props.quote.commit(signer, null, skipChecks).catch((err) => {
            if (setAmountLockRef.current)
                setAmountLockRef.current(false);
            throw err;
        });
    }, [props.quote, signer]);
    const [onRefund, refundLoading, refundSuccess, refundError] = useAsync(async () => {
        const res = await props.quote.refund(signer);
        if (setAmountLockRef.current)
            setAmountLockRef.current(false);
        return res;
    }, [props.quote, signer]);
    const abortSignalRef = useAbortSignalRef([props.quote]);
    const [retryWaitForPayment, _, __, paymentError] = useAsync(async () => {
        try {
            await props.quote.waitForPayment(abortSignalRef.current, 2);
        }
        catch (e) {
            if (abortSignalRef.current.aborted)
                return;
            // Enhance error message for transaction expiration
            if (e?.message?.includes('expired') || e?.message?.includes('Expired')) {
                const enhancedError = new Error('Transaction expired before confirmation, please try again!');
                enhancedError.stack = e.stack;
                throw enhancedError;
            }
            throw e;
        }
    }, [props.quote]);
    useEffect(() => {
        const abortController = new AbortController();
        if (state === ToBTCSwapState.COMMITED)
            retryWaitForPayment();
        return () => abortController.abort();
    }, [state]);
    //Checks the balance of the signer in the CREATED state
    const [notEnoughBalanceError] = useWithAwait(async () => {
        if (props.quote == null || signer == null || state !== ToBTCSwapState.CREATED)
            return;
        const resp = await props.quote.hasEnoughBalance();
        if (!resp.enoughBalance)
            return "You don't have enough funds to initiate the swap!";
    }, [props.quote, signer, state]);
    const feeNeeded = useMemo(() => {
        if (props.notEnoughForGas == null || props.quote == null || swapper == null)
            return null;
        const nativeToken = swapper.Utils.getNativeToken(props.quote.chainIdentifier);
        const amount = props.notEnoughForGas;
        return {
            rawAmount: amount,
            amount: toHumanReadableString(amount, nativeToken),
            nativeToken,
        };
    }, [props.notEnoughForGas, props.quote, swapper]);
    // Track cancellation states
    const isContinueCancelled = useMemo(() => {
        const cancelled = isUserCancellation(continueError);
        console.log('📊 isContinueCancelled:', cancelled, 'continueError:', continueError);
        return cancelled;
    }, [continueError, isUserCancellation]);
    const isRefundCancelled = useMemo(() => {
        const cancelled = isUserCancellation(refundError);
        console.log('📊 isRefundCancelled:', cancelled, 'refundError:', refundError);
        return cancelled;
    }, [refundError, isUserCancellation]);
    const isCreated = state === ToBTCSwapState.CREATED ||
        (state === ToBTCSwapState.QUOTE_SOFT_EXPIRED && continueLoading);
    const isExpired = state === ToBTCSwapState.QUOTE_EXPIRED ||
        (state === ToBTCSwapState.QUOTE_SOFT_EXPIRED && !continueLoading);
    const isPaying = state === ToBTCSwapState.COMMITED && paymentError == null;
    const isPayError = state === ToBTCSwapState.COMMITED && paymentError != null;
    const isSuccess = state === ToBTCSwapState.CLAIMED || state === ToBTCSwapState.SOFT_CLAIMED;
    const isRefundable = state === ToBTCSwapState.REFUNDABLE && !refundLoading;
    const isRefunding = state === ToBTCSwapState.REFUNDABLE && refundLoading;
    const isRefunded = state === ToBTCSwapState.REFUNDED;
    useEffect(() => {
        if (isExpired || isSuccess || isRefunded) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isExpired, isSuccess, isRefunded]);
    // Source wallet data (input token)
    const inputAmount = props.quote.getInput().amount;
    const inputToken = props.quote.getInput().token;
    const inputValue = usePricing(inputAmount, inputToken);
    const sourceWallet = useMemo(() => {
        if (!inputToken)
            return null;
        const chainIcon = props.quote.chainIdentifier?.includes('SOLANA')
            ? '/icons/chains/solana.svg'
            : props.quote.chainIdentifier?.includes('STARKNET')
                ? '/icons/chains/STARKNET.svg'
                : undefined;
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
    }, [inputToken, inputAmount, inputValue, props.quote.chainIdentifier]);
    // Destination wallet data (output token)
    const outputAmount = props.quote.getOutput().amount;
    const outputToken = props.quote.getOutput().token;
    const outputValue = usePricing(outputAmount, outputToken);
    const outputAddress = props.quote.getOutputAddress();
    const destinationWallet = useMemo(() => {
        if (!outputToken)
            return null;
        const chainIcon = outputToken.ticker === 'BTC'
            ? '/icons/chains/bitcoin.svg'
            : outputToken.ticker === 'BTCLN'
                ? '/icons/chains/LIGHTNING.svg'
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
        };
    }, [outputToken, outputAmount, outputValue, outputAddress]);
    const executionSteps = [
        {
            icon: ic_check_outline,
            text: 'Transaction confirmed',
            type: 'success',
        },
    ];
    if (isCreated && !continueLoading)
        executionSteps[0] = {
            icon: ic_play_circle_outline,
            text: 'Sending transaction',
            type: 'loading',
        };
    if (isCreated && continueLoading)
        executionSteps[0] = {
            icon: ic_hourglass_empty_outline,
            text: 'Sending init transaction',
            type: 'loading',
        };
    if (isContinueCancelled) {
        console.log('✅ Setting executionSteps[0] to CANCELLED');
        executionSteps[0] = {
            icon: ic_cancel_outline,
            text: 'Transaction cancelled',
            type: 'failed',
        };
    }
    if (isExpired)
        executionSteps[0] = {
            icon: ic_hourglass_disabled_outline,
            text: 'Quote expired',
            type: 'failed',
        };
    // console.log('🎨 RENDER STATE:', {
    //   state,
    //   isInitiated,
    //   isCreated,
    //   isContinueCancelled,
    //   continueError: continueError?.message,
    //   continueLoading,
    //   executionSteps: executionSteps[0],
    // });
    if (props.quote.getType() === SwapType.TO_BTCLN) {
        executionSteps[1] = {
            icon: ic_flash_on_outline,
            text: 'Lightning payout',
            type: 'disabled',
        };
        if (isPaying || isPayError)
            executionSteps[1] = {
                icon: ic_hourglass_top_outline,
                text: 'Sending lightning payout',
                type: 'loading',
            };
        if (isSuccess)
            executionSteps[1] = {
                icon: ic_check_outline,
                text: 'Lightning payout success',
                type: 'success',
            };
        if (isRefundable || isRefunding || isRefunded)
            executionSteps[1] = {
                icon: ic_error_outline_outline,
                text: 'Lightning payout failed',
                type: 'failed',
            };
    }
    else {
        executionSteps[1] = {
            icon: bitcoin,
            text: 'Bitcoin payout',
            type: 'disabled',
        };
        if (isPaying || isPayError)
            executionSteps[1] = {
                icon: ic_hourglass_top_outline,
                text: 'Sending bitcoin payout',
                type: 'loading',
            };
        if (isSuccess)
            executionSteps[1] = {
                icon: ic_check_outline,
                text: 'Bitcoin payout sent',
                type: 'success',
            };
        if (isRefundable || isRefunding || isRefunded)
            executionSteps[1] = {
                icon: ic_error_outline_outline,
                text: 'Bitcoin payout failed',
                type: 'failed',
            };
    }
    if (isRefundable)
        executionSteps[2] = {
            icon: ic_settings_backup_restore_outline,
            text: 'Refundable',
            type: 'loading',
        };
    if (isRefunding)
        executionSteps[2] = {
            icon: ic_hourglass_empty_outline,
            text: 'Sending refund transaction',
            type: 'loading',
        };
    if (isRefunded)
        executionSteps[2] = {
            icon: ic_check_outline,
            text: 'Refunded',
            type: 'success',
        };
    return (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: isCreated && confidenceWarning, variant: "warning", children: [_jsx("strong", { children: "Payment might likely fail!" }), _jsx("label", { children: "We weren't able to check if the recipient is reachable (send probe request) on the Lightning network, this is common with some wallets, but could also indicate that the destination is unreachable and payment might therefore fail (you will get a refund in that case)!" })] }), _jsxs(Alert, { className: "text-center mb-3", show: isCreated && nonCustodialWarning && props.type === 'swap', variant: "success", children: [_jsx("strong", { children: "Non-custodial wallet info" }), _jsx("label", { children: "Please make sure your lightning wallet is online & running to be able to receive a lightning network payment, otherwise the payment will fail (you will get a refund in that case)!" })] }), isInitiated ? (_jsxs("div", { className: "swap-panel__card", children: [_jsx(StepByStep, { steps: executionSteps, sourceWallet: sourceWallet, destinationWallet: destinationWallet }), isSuccess ? (_jsxs("div", { className: "swap-steps__alert is-success", children: [_jsx("div", { className: "swap-steps__alert__icon", children: _jsx(Icon, { size: 20, icon: ic_check_circle }) }), _jsx("strong", { className: "swap-steps__alert__title", children: "Swap success" }), _jsx("label", { className: "swap-steps__alert__description", children: "Your swap was executed successfully!" }), props.quote.getType() === SwapType.TO_BTC ? (_jsxs("a", { href: FEConstants.btcBlockExplorer + props.quote.getOutputTxId(), target: "_blank", rel: "noopener noreferrer", className: "swap-steps__alert__action", children: [_jsx("div", { className: "sc-text", children: "View transaction" }), _jsx("div", { className: "icon icon-new-window" })] })) : ('')] })) : null] })) : null, _jsxs(Alert, { className: "text-center mb-3", show: !!notEnoughBalanceError, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Not enough funds" }), _jsx("label", { children: notEnoughBalanceError })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Swap initialization error", error: continueError }), (isCreated && !notEnoughBalanceError) || isPaying ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: !!props.notEnoughForGas && signer != null, variant: "danger", closeVariant: "white", children: [_jsxs("strong", { children: ["Not enough ", feeNeeded?.nativeToken?.ticker, " for fees"] }), _jsxs("label", { children: ["You need at least ", feeNeeded?.amount, " ", feeNeeded?.nativeToken?.ticker, " to pay for fees and deposits!"] })] }), !isPaying && !continueLoading && !isInitiated ? (_jsx(ButtonWithWallet, { className: "swap-panel__action", requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: () => onContinue(), disabled: isPaying || continueLoading || !!props.notEnoughForGas, size: "lg", children: props.type === 'payment' ? 'Pay' : 'Swap' })) : ('')] })) : (''), isPayError ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-3", title: "Swap error", error: paymentError }), _jsx(Button, { onClick: () => retryWaitForPayment(), variant: "secondary", children: "Retry" })] })) : (''), isRefundable || isRefunding ? (_jsxs(_Fragment, { children: [_jsxs(Alert, { variant: "danger", className: "mb-3", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap failed, you can refund your prior deposit" })] }), _jsx(ErrorAlert, { className: "mb-3", title: "Refund error", error: refundError }), _jsxs(ButtonWithWallet, { requiredWalletAddress: props.quote._getInitiator(), chainId: props.quote.chainIdentifier, onClick: onRefund, disabled: refundLoading, variant: "secondary", children: [refundLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', "Refund deposit"] })] })) : (''), _jsxs(Alert, { variant: "danger", className: "mb-3", show: isRefunded, children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Funds refunded successfully!" })] }), isRefunded || isExpired || !!notEnoughBalanceError ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", className: "swap-panel__action", children: "New quote" })) : (''), isSuccess && props.type !== 'payment' ? (_jsx(BaseButton, { onClick: props.refreshQuote, variant: "primary", className: "swap-panel__action", children: "New Swap" })) : ('')] }));
}
