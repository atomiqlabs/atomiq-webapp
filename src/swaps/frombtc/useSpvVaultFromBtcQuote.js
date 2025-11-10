import { SpvFromBTCSwapState } from "@atomiqlabs/sdk";
import { useSwapState } from "../hooks/useSwapState";
import { useEffect, useMemo, useState } from "react";
import { useStateRef } from "../../utils/hooks/useStateRef";
import { useChain } from "../../wallets/hooks/useChain";
import { useSmartChainWallet } from "../../wallets/hooks/useSmartChainWallet";
import { useAsync } from "../../utils/hooks/useAsync";
import { useAbortSignalRef } from "../../utils/hooks/useAbortSignal";
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { getDeltaText } from "../../utils/Utils";
export function useSpvVaultFromBtcQuote(quote, UICallback, feeRate, inputWalletBalance) {
    const UICallbackRef = useStateRef(UICallback);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote, (state) => {
        if (state === SpvFromBTCSwapState.CREATED ||
            state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED ||
            state === SpvFromBTCSwapState.QUOTE_EXPIRED)
            return;
        if (UICallbackRef.current)
            UICallbackRef.current(quote, "hide");
    });
    const bitcoinWallet = useChain('BITCOIN')?.wallet;
    const smartChainWallet = useSmartChainWallet(quote);
    const isAlreadyClaimable = useMemo(() => quote?.isClaimable(), [quote]);
    const [txData, setTxData] = useState(null);
    const [onSend, sendLoading, sendSuccess, sendError] = useAsync(() => {
        if (UICallbackRef.current)
            UICallbackRef.current(quote, "lock");
        return quote
            .sendBitcoinTransaction(bitcoinWallet.instance, feeRate != null ? Math.max(feeRate, quote.minimumBtcFeeRate) : undefined)
            .then(val => {
            if (UICallbackRef.current)
                UICallbackRef.current(quote, "hide");
            return val;
        })
            .catch((e) => {
            if (UICallbackRef.current)
                UICallbackRef.current(quote, "show");
            throw e;
        });
    }, [quote, bitcoinWallet, feeRate]);
    const abortSignalRef = useAbortSignalRef([quote]);
    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
        return quote.waitForBitcoinTransaction(abortSignalRef.current, null, (txId, confirmations, confirmationTarget, txEtaMs) => {
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
        });
    }, [quote]);
    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return quote.claim(smartChainWallet.instance);
    }, [quote, smartChainWallet]);
    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if (state === SpvFromBTCSwapState.POSTED || state === SpvFromBTCSwapState.BROADCASTED) {
            onWaitForPayment();
        }
        let timer = null;
        if (state === SpvFromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 60 * 1000);
        }
        return () => {
            if (timer != null)
                clearTimeout(timer);
            setClaimable(false);
        };
    }, [state]);
    const hasEnoughBalance = useMemo(() => inputWalletBalance == null || quote == null
        ? true
        : inputWalletBalance >= quote.getInput().rawAmount, [inputWalletBalance, quote]);
    const isQuoteExpired = state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
        (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && !sendLoading && !waitingPayment);
    const isCreated = state === SpvFromBTCSwapState.CREATED ||
        (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && sendLoading);
    const isSending = state === SpvFromBTCSwapState.CREATED && sendLoading;
    const isBroadcasting = state === SpvFromBTCSwapState.SIGNED ||
        state === SpvFromBTCSwapState.POSTED ||
        (state === SpvFromBTCSwapState.BROADCASTED && txData == null);
    const isReceived = state === SpvFromBTCSwapState.BROADCASTED && txData != null;
    const isClaimable = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isFailed = state === SpvFromBTCSwapState.FAILED ||
        state === SpvFromBTCSwapState.DECLINED ||
        state === SpvFromBTCSwapState.CLOSED;
    const isSuccess = state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED;
    /*
      Steps:
      1. Bitcoin payment -> Signing bitcoin transaction -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
      2. Claim transaction -> Sending claim transaction -> Claim success
       */
    const executionSteps = [
        { icon: bitcoin, text: 'Bitcoin payment', type: 'loading' },
        {
            icon: ic_receipt,
            text: 'Claim transaction',
            type: 'disabled',
        },
    ];
    if (isSending)
        executionSteps[0] = {
            icon: ic_hourglass_empty_outline,
            text: 'Signing bitcoin transaction',
            type: 'loading',
        };
    if (isBroadcasting)
        executionSteps[0] = {
            icon: ic_hourglass_empty_outline,
            text: 'Broadcasting bitcoin transaction',
            type: 'loading',
        };
    if (isReceived)
        executionSteps[0] = {
            icon: ic_hourglass_top_outline,
            text: 'Waiting bitcoin confirmations',
            type: 'loading',
        };
    if (isQuoteExpired)
        executionSteps[0] = {
            icon: ic_hourglass_disabled_outline,
            text: 'Quote expired',
            type: 'failed',
        };
    if (isClaimable || isClaiming || isSuccess)
        executionSteps[0] = {
            icon: ic_check_circle_outline,
            text: 'Bitcoin confirmed',
            type: 'success',
        };
    if (isFailed)
        executionSteps[0] = {
            icon: ic_refresh,
            text: 'Bitcoin payment reverted',
            type: 'failed',
        };
    if (isClaimable)
        executionSteps[1] = {
            icon: ic_receipt,
            text: 'Claim transaction',
            type: 'loading',
        };
    if (isClaiming)
        executionSteps[1] = {
            icon: ic_hourglass_empty_outline,
            text: 'Sending claim transaction',
            type: 'loading',
        };
    if (isSuccess)
        executionSteps[1] = {
            icon: ic_receipt,
            text: 'Claiming transaction',
            type: 'success',
        };
    const step1init = useMemo(() => (!isCreated ? undefined : {
        bitcoinWallet: bitcoinWallet,
        hasEnoughBalance,
        init: bitcoinWallet != null ? {
            onClick: onSend,
            loading: sendLoading,
            disabled: sendLoading || !hasEnoughBalance
        } : undefined,
        error: sendError != null ? {
            title: "Sending BTC failed",
            error: sendError
        } : undefined,
        expiry: hasEnoughBalance && !sendLoading ? {
            remaining: quoteTimeRemaining,
            total: totalQuoteTime
        } : undefined
    }), [
        isCreated,
        bitcoinWallet,
        hasEnoughBalance,
        onSend,
        sendError,
        sendLoading,
        quoteTimeRemaining,
        totalQuoteTime
    ]);
    const step3awaitingConfirmations = useMemo(() => (!isReceived ? undefined : {
        txData: {
            txId: txData.txId,
            confirmations: {
                actual: txData.confirmations,
                required: txData.confTarget
            },
            eta: txData.txEtaMs != null ? {
                millis: txData.txEtaMs,
                text: txData.txEtaMs === -1 || txData.txEtaMs > 60 * 60 * 1000
                    ? '>1 hour'
                    : '~' + getDeltaText(txData.txEtaMs)
            } : undefined
        },
        error: waitPaymentError != null ? {
            title: "Wait payment error",
            error: waitPaymentError,
            retry: onWaitForPayment
        } : undefined
    }), [
        isReceived,
        txData,
        waitPaymentError,
        onWaitForPayment
    ]);
    const step4claim = useMemo(() => (!isClaimable && !isClaiming ? undefined : {
        waitingForWatchtowerClaim: !(claimable || isAlreadyClaimable),
        smartChainWallet,
        claim: {
            onClick: onClaim,
            loading: claimLoading,
            disabled: claimLoading
        },
        error: claimError != null ? {
            title: "Claim error",
            error: claimError
        } : undefined
    }), [
        isClaimable,
        isClaiming,
        claimable,
        isAlreadyClaimable,
        smartChainWallet,
        onClaim,
        claimLoading,
        claimError
    ]);
    const step5 = useMemo(() => (!isSuccess && !isFailed && !isQuoteExpired ? undefined : {
        state: isSuccess
            ? "success"
            : isFailed
                ? "failed"
                : "expired",
    }), [
        isSuccess,
        isFailed,
        isQuoteExpired
    ]);
    return {
        executionSteps: isInitiated || (isCreated && sendLoading) ? executionSteps : undefined,
        step1init,
        step2broadcasting: isBroadcasting ? {} : undefined,
        step3awaitingConfirmations,
        step4claim,
        step5
    };
}
