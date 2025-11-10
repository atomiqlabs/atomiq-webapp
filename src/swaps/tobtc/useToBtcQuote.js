import { SwapType, ToBTCSwapState } from "@atomiqlabs/sdk";
import { useCheckAdditionalGas } from "../useCheckAdditionalGas";
import { useEffect, useMemo } from "react";
import { useSmartChainWallet } from "../../wallets/hooks/useSmartChainWallet";
import { useSwapState } from "../hooks/useSwapState";
import { useStateRef } from "../../utils/hooks/useStateRef";
import { useAsync } from "../../utils/hooks/useAsync";
import { useAbortSignalRef } from "../../utils/hooks/useAbortSignal";
import { ic_play_circle_outline } from 'react-icons-kit/md/ic_play_circle_outline';
import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
export function useToBtcQuote(quote, UICallback, type, inputWalletBalance) {
    const additionalGasRequired = useCheckAdditionalGas(quote);
    const wallet = useSmartChainWallet(quote, true);
    const UICallbackRef = useStateRef(UICallback);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote, (state) => {
        if (state === ToBTCSwapState.CREATED ||
            state === ToBTCSwapState.QUOTE_SOFT_EXPIRED ||
            state === ToBTCSwapState.QUOTE_EXPIRED)
            return;
        if (UICallbackRef.current)
            UICallbackRef.current(quote, "hide");
    });
    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync((skipChecks) => {
        if (UICallbackRef.current)
            UICallbackRef.current(quote, "lock");
        return quote.commit(wallet.instance, null, skipChecks).then(res => {
            if (UICallbackRef.current)
                UICallbackRef.current(quote, "hide");
            return res;
        }).catch((err) => {
            if (UICallbackRef.current)
                UICallbackRef.current(quote, "show");
            throw err;
        });
    }, [quote, wallet]);
    const [onRefund, refundLoading, refundSuccess, refundError] = useAsync(() => quote.refund(wallet.instance), [quote, wallet]);
    const abortSignalRef = useAbortSignalRef([quote]);
    const [retryWaitForPayment, _, __, paymentError] = useAsync(async () => {
        try {
            await quote.waitForPayment(abortSignalRef.current, 2);
        }
        catch (e) {
            if (abortSignalRef.current.aborted)
                return;
            throw e;
        }
    }, [quote]);
    useEffect(() => {
        const abortController = new AbortController();
        if (state === ToBTCSwapState.COMMITED)
            retryWaitForPayment();
        return () => abortController.abort();
    }, [state]);
    const hasEnoughBalance = useMemo(() => inputWalletBalance == null || quote == null
        ? true
        : inputWalletBalance >= quote.getInput().rawAmount, [inputWalletBalance, quote]);
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
    const executionSteps = [
        {
            icon: ic_check_outline,
            text: 'Transaction confirmed',
            type: 'success',
        },
    ];
    if (isCreated) {
        if (continueError) {
            executionSteps[0] = {
                icon: ic_warning,
                text: 'Transaction didn’t confirm',
                type: 'failed',
            };
        }
        else if (continueLoading) {
            executionSteps[0] = {
                icon: ic_hourglass_empty_outline,
                text: 'Sending init transaction',
                type: 'loading',
            };
        }
        else {
            executionSteps[0] = {
                icon: ic_play_circle_outline,
                text: 'Send init transaction',
                type: 'loading',
            };
        }
    }
    if (isExpired) {
        executionSteps[0] = {
            icon: ic_hourglass_disabled_outline,
            text: 'Quote expired',
            type: 'failed',
        };
    }
    if (quote.getType() === SwapType.TO_BTCLN) {
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
                icon: ic_warning,
                text: 'Payout failed',
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
    if (isRefundable) {
        executionSteps[2] = {
            icon: ic_settings_backup_restore_outline,
            text: 'Refundable',
            type: 'loading'
        };
    }
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
    const step1init = useMemo(() => (!isCreated ? undefined : {
        invalidSmartChainWallet: wallet == null,
        hasEnoughBalance,
        additionalGasRequired,
        init: wallet != null ? {
            text: type === 'payment' ? 'Pay' : 'Swap',
            onClick: onContinue,
            loading: continueLoading,
            disabled: !hasEnoughBalance || !!additionalGasRequired
        } : undefined,
        error: continueError != null ? {
            title: 'Swap initialization error',
            error: continueError
        } : undefined,
        expiry: {
            remaining: quoteTimeRemaining,
            total: totalQuoteTime
        }
    }), [
        isCreated,
        wallet,
        hasEnoughBalance,
        additionalGasRequired,
        wallet,
        type,
        onContinue,
        continueLoading,
        continueError,
        quoteTimeRemaining,
        totalQuoteTime
    ]);
    const step2paying = useMemo(() => (!isPaying && !isPayError ? undefined : {
        error: paymentError ? {
            title: 'Swap error',
            error: paymentError,
            retry: retryWaitForPayment
        } : undefined
    }), [
        isPaying,
        isPayError,
        paymentError,
        retryWaitForPayment
    ]);
    const step3refund = useMemo(() => (!isRefundable && !isRefunding ? undefined : {
        invalidSmartChainWallet: wallet == null,
        refund: wallet != null ? {
            onClick: onRefund,
            loading: refundLoading,
            disabled: refundLoading
        } : undefined,
        error: refundError ? {
            title: 'Refund error',
            error: refundError
        } : undefined
    }), [
        isRefundable,
        isRefunding,
        wallet,
        onRefund,
        refundLoading,
        refundError
    ]);
    const step4 = useMemo(() => (!isSuccess && !isRefunded && !isExpired ? undefined : {
        state: isSuccess
            ? "success"
            : isRefunded
                ? "refunded"
                : "expired",
    }), [
        isSuccess,
        isRefunded,
        isExpired
    ]);
    return {
        executionSteps: isInitiated ? executionSteps : undefined,
        step1init,
        step2paying,
        step3refund,
        step4
    };
}
