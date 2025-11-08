import {SingleStep} from "../../components/StepByStep";
import {ChainWalletData} from "../../wallets/ChainDataProvider";
import {ExtensionBitcoinWallet} from "../../wallets/chains/bitcoin/base/ExtensionBitcoinWallet";
import {SpvFromBTCSwap, SpvFromBTCSwapState} from "@atomiqlabs/sdk";
import {useSwapState} from "../hooks/useSwapState";
import {useEffect, useMemo, useState} from "react";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {useChain} from "../../wallets/hooks/useChain";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";
import {useAsync} from "../../utils/hooks/useAsync";
import {useAbortSignalRef} from "../../utils/hooks/useAbortSignal";
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import {getDeltaText} from "../../utils/Utils";

export type SpvVaultFromBtcPage = {
  executionSteps?: SingleStep[],
  step1init?: {
    bitcoinWallet?: ChainWalletData<ExtensionBitcoinWallet>["wallet"],
    hasEnoughBalance?: boolean,
    init?: () => void,
    error?: {
      title: string,
      error: Error
    }
  },
  step2broadcasting?: {},
  step3awaitingConfirmations?: {
    txData: {
      txId: string,
      confirmations: {
        actual: number,
        required: number
      },
      eta: {
        millis: number,
        text: string
      }
    },
    error?: {
      title: string,
      error: Error,
      retry: () => void
    }
  },
  step4claim?: {
    waitingForWatchtowerClaim: boolean,
    smartChainWallet?: ChainWalletData<any>["wallet"],
    claim: {
      onClick: () => void,
      loading: boolean,
      disabled: boolean
    },
    error?: {
      title: string,
      error: Error
    }
  },
  step5?: {
    state: "success" | "failed" | "expired"
  }
};

export function useSpvVaultFromBtcQuote(
  quote: SpvFromBTCSwap<any>,
  setAmountLock: (isLocked: boolean) => void,
  feeRate?: number,
  inputWalletBalance?: number
): SpvVaultFromBtcPage {
  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote);
  const bitcoinWallet = useChain('BITCOIN')?.wallet;
  const smartChainWallet = useSmartChainWallet(quote);

  const isAlreadyClaimable = useMemo(() => quote?.isClaimable(), [quote]);
  const setAmountLockRef = useStateRef(setAmountLock);
  const [txData, setTxData] = useState<{
    txId: string;
    confirmations: number;
    confTarget: number;
    txEtaMs: number;
  }>(null);

  const [onSend, sendLoading, sendSuccess, sendError] = useAsync(() => {
    if (setAmountLockRef.current != null) {
      console.log('SpvVaultFromBTCQuoteSummary: onSend(): setting amount lock to true');
      setAmountLockRef.current(true);
    }
    return quote
      .sendBitcoinTransaction(
        bitcoinWallet.instance,
        feeRate!=null ? Math.max(feeRate, quote.minimumBtcFeeRate) : undefined
      )
      .catch((e) => {
        if (setAmountLockRef.current != null) {
          console.log(
            'SpvVaultFromBTCQuoteSummary: onSend(): signAndSubmit failed - setting amount lock to false'
          );
          setAmountLockRef.current(false);
        }
        throw e;
      });
  }, [quote, bitcoinWallet, feeRate]);

  const abortSignalRef = useAbortSignalRef([quote]);

  const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
    return quote.waitForBitcoinTransaction(
      abortSignalRef.current,
      null,
      (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
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
      }
    );
  }, [quote]);

  const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
    return quote.claim(smartChainWallet.instance);
  }, [quote, smartChainWallet]);

  const [claimable, setClaimable] = useState(false);
  useEffect(() => {
    if (state === SpvFromBTCSwapState.POSTED || state === SpvFromBTCSwapState.BROADCASTED) {
      onWaitForPayment();
    }

    let timer: NodeJS.Timeout = null;
    if (state === SpvFromBTCSwapState.BTC_TX_CONFIRMED) {
      timer = setTimeout(() => {
        setClaimable(true);
      }, 60 * 1000);
    }

    return () => {
      if (timer != null) clearTimeout(timer);
      setClaimable(false);
    };
  }, [state]);

  const hasEnoughBalance = useMemo(
    () =>
      inputWalletBalance == null || quote == null
        ? true
        : inputWalletBalance >= quote.getInput().rawAmount,
    [inputWalletBalance, quote]
  );

  const isQuoteExpired =
    state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
    (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && !sendLoading && !waitingPayment);
  const isCreated =
    state === SpvFromBTCSwapState.CREATED ||
    (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && sendLoading);
  const isSending = state === SpvFromBTCSwapState.CREATED && sendLoading;
  const isBroadcasting =
    state === SpvFromBTCSwapState.SIGNED ||
    state === SpvFromBTCSwapState.POSTED ||
    (state === SpvFromBTCSwapState.BROADCASTED && txData == null);
  const isReceived = state === SpvFromBTCSwapState.BROADCASTED && txData != null;
  const isClaimable = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
  const isClaiming = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
  const isFailed =
    state === SpvFromBTCSwapState.FAILED ||
    state === SpvFromBTCSwapState.DECLINED ||
    state === SpvFromBTCSwapState.CLOSED;
  const isSuccess = state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED;

  useEffect(() => {
    if (isSuccess || isFailed || isQuoteExpired) {
      console.log('SpvVaultFromBTCQuoteSummary: useEffect(state): setting amount lock to false');
      if (setAmountLockRef.current != null) setAmountLockRef.current(false);
    }
  }, [isSuccess, isFailed, isQuoteExpired]);


  /*
    Steps:
    1. Bitcoin payment -> Signing bitcoin transaction -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
    2. Claim transaction -> Sending claim transaction -> Claim success
     */
  const executionSteps: SingleStep[] = [
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
    init: bitcoinWallet!=null ? onSend : undefined,
    error: sendError!=null ? {
      title: "Sending BTC failed",
      error: sendError
    } : undefined
  }), [
    isCreated,
    bitcoinWallet,
    hasEnoughBalance,
    onSend,
    sendError
  ]);

  const step3awaitingConfirmations = useMemo(() => (!isReceived ? undefined: {
    txData: {
      txId: txData.txId,
      confirmations: {
        actual: txData.confirmations,
        required: txData.confTarget
      },
      eta: {
        millis: txData.txEtaMs,
        text: txData.txEtaMs === -1 || txData.txEtaMs > 60 * 60 * 1000
          ? '>1 hour'
          : '~' + getDeltaText(txData.txEtaMs)
      }
    },
    error: waitPaymentError!=null ? {
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
    error: claimError!=null ? {
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

  const step5 = useMemo(() => ({
    state: isSuccess
      ? "success" as const
      : isFailed
        ? "failed" as const
        : "expired" as const,
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
