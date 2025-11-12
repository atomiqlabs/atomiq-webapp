import { LnForGasSwapState } from '@atomiqlabs/sdk';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useAbortSignalRef } from '../utils/useAbortSignal';
import { useAsync } from '../utils/useAsync';
import { useChain } from '../chains/useChain';
import { ChainsContext } from '../../context/ChainsContext';
import { useSwapState } from "./helpers/useSwapState";
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_swap_horizontal_circle_outline } from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import { ic_verified_outline } from 'react-icons-kit/md/ic_verified_outline';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
export function useTrustedFromBtcLnQuote(quote) {
    const { connectWallet, disconnectWallet } = useContext(ChainsContext);
    const lightningWallet = useChain('LIGHTNING')?.wallet;
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote);
    const [pay, payLoading, payResult, payError] = useAsync(() => lightningWallet.instance.sendPayment(quote.getAddress()), [lightningWallet, quote]);
    const [callPayFlag, setCallPayFlag] = useState(false);
    useEffect(() => {
        if (!callPayFlag)
            return;
        setCallPayFlag(false);
        if (!lightningWallet)
            return;
        pay();
    }, [callPayFlag, lightningWallet, pay]);
    const abortSignalRef = useAbortSignalRef([quote]);
    const [waitForPayment, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        return quote
            .waitForPayment(abortSignalRef.current, 2)
            .then(() => true);
    }, [quote]);
    useEffect(() => {
        if (quote != null && quote.getState() === LnForGasSwapState.PR_CREATED) {
            waitForPayment();
        }
    }, [quote]);
    const isQuoteExpired = state === LnForGasSwapState.EXPIRED && !paymentWaiting;
    const isFailed = state === LnForGasSwapState.FAILED;
    const isCreated = state === LnForGasSwapState.PR_CREATED;
    const isPaid = state === LnForGasSwapState.PR_PAID;
    const isSuccess = state === LnForGasSwapState.FINISHED;
    const executionSteps = [
        {
            icon: ic_check_outline,
            text: 'Lightning payment received',
            type: 'success',
        },
        {
            icon: ic_swap_horizontal_circle_outline,
            text: 'Receive funds',
            type: 'disabled',
        },
    ];
    if (isPaid)
        executionSteps[1] = {
            icon: ic_hourglass_top_outline,
            text: 'Receiving funds',
            type: 'loading',
        };
    if (isCreated)
        executionSteps[0] = {
            icon: ic_flash_on_outline,
            text: 'Awaiting lightning paymenxxt',
            type: 'loading',
        };
    if (isQuoteExpired)
        executionSteps[0] = {
            icon: ic_hourglass_disabled_outline,
            text: 'Quote expired',
            type: 'failed',
        };
    if (isFailed) {
        executionSteps[0] = {
            icon: ic_refresh,
            text: 'Lightning payment reverted',
            type: 'failed',
        };
        executionSteps[1] = {
            icon: ic_watch_later_outline,
            text: 'Swap failed',
            type: 'failed',
        };
    }
    if (isSuccess)
        executionSteps[1] = {
            icon: ic_verified_outline,
            text: 'Payout success',
            type: 'success',
        };
    const step1paymentWait = useMemo(() => {
        if (!isCreated)
            return;
        let error;
        if (lightningWallet != null && payError != null)
            error = {
                title: 'Lightning transaction error',
                type: 'error',
                error: payError,
            };
        if (paymentError != null)
            error = {
                title: 'Connection problem',
                type: 'warning',
                error: paymentError,
                retry: waitForPayment
            };
        return {
            error,
            walletConnected: lightningWallet != null && paymentWaiting
                ? {
                    lightningWallet,
                    payWithWebLn: {
                        onClick: () => {
                            pay();
                        },
                        loading: payLoading,
                    },
                    useExternalWallet: {
                        onClick: () => {
                            disconnectWallet('LIGHTNING');
                        },
                    },
                }
                : undefined,
            walletDisconnected: lightningWallet == null && paymentWaiting
                ? {
                    address: {
                        value: quote.getAddress(),
                        hyperlink: quote.getHyperlink(),
                        copy: () => {
                            navigator.clipboard.writeText(quote.getAddress());
                            return true;
                        }
                    },
                    payWithLnWallet: {
                        onClick: () => {
                            window.location.href = quote.getHyperlink();
                        },
                    },
                    payWithWebLn: {
                        onClick: () => {
                            connectWallet('LIGHTNING').then((success) => {
                                //Call pay on next state update
                                if (success)
                                    setCallPayFlag(true);
                            });
                        },
                        loading: payLoading,
                    },
                }
                : undefined,
            expiry: {
                remaining: quoteTimeRemaining,
                total: totalQuoteTime,
            },
        };
    }, [
        isCreated,
        paymentWaiting,
        quote,
        quoteTimeRemaining,
        totalQuoteTime,
        lightningWallet,
        paymentError,
        waitForPayment,
        pay,
        payLoading,
        payError
    ]);
    const step2receivingFunds = useMemo(() => (!isPaid ? undefined : {
        error: paymentError != null ? {
            title: 'Connection problem',
            type: 'warning',
            error: paymentError,
            retry: waitForPayment
        } : undefined
    }), [
        paymentError,
        waitForPayment
    ]);
    const step3 = useMemo(() => {
        if (!isSuccess && !isFailed && !isQuoteExpired)
            return;
        return {
            state: isSuccess
                ? 'success'
                : isFailed
                    ? 'failed'
                    : 'expired'
        };
    }, [isSuccess, isFailed, isQuoteExpired]);
    return {
        executionSteps,
        step1paymentWait,
        step2receivingFunds,
        step3
    };
}
