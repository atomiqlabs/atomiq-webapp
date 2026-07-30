import { SingleStep } from '../../components/swaps/StepByStep';
import { Chain } from '../../providers/ChainsProvider';
import {
  IBitcoinWallet,
  InvalidBitcoinDepositError,
  ISwap,
  SpvFromBTCSwap,
  SpvFromBTCExternalDepositInvalidUtxo,
  SpvFromBTCSwapMode,
  SpvFromBTCSwapState,
  TokenAmount,
} from '@atomiqlabs/sdk';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStateRef } from '../utils/useStateRef';
import { useSmartChainWallet } from '../wallets/useSmartChainWallet';
import { useAsync } from '../utils/useAsync';
import { useAbortSignalRef } from '../utils/useAbortSignal';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { getDeltaText } from '../../utils/Utils';
import { SwapPageUIState } from '../pages/useSwapPage';
import {TxDataType} from "../../types/swaps/TxDataType";
import {useSwapState} from "./helpers/useSwapState";
import {useWallet} from "../wallets/useWallet";
import {useIntermediateBitcoinWallet} from "../wallets/useIntermediateBitcoinWallet";
import {ChainsContext} from "../../context/ChainsContext";
import {useLocalStorage} from "../utils/useLocalStorage";
import {useWithAwait} from "../utils/useWithAwait";

export type SpvVaultFromBtcPage = {
  executionSteps?: SingleStep[];
  step1init?: {
    backupRequired?: {
      backup: () => void;
    };
    walletConnected?: {
      bitcoinWallet?: Chain<"BITCOIN">['wallet'];
      hasEnoughBalance?: boolean;
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
        disabled: boolean;
      };
      useExternalWallet?: {
        onClick: () => void;
      };
    };
    walletDisconnected?: {
      address: {
        value: string;
        hyperlink: string;
        copy: () => boolean;
      };
      addressCopyWarningModal?: {
        btcAmount: TokenAmount;
        close: (accepted: boolean) => void;
        showAgain: {
          checked: boolean;
          onChange: (checked: boolean) => void;
        };
      };
      payWithBitcoinWallet: {
        onClick: () => void;
      };
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
      };
      depositStatus?: {
        expectedAmount: TokenAmount;
        invalidDeposits?: SpvFromBTCExternalDepositInvalidUtxo[];
      };
    };
    error?: {
      title: string;
      description?: string;
      error?: Error;
      type: 'warning' | 'error';
      retry?: () => void;
      requiresRequote?: boolean;
    };
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step2broadcasting?: {
    error?: {
      title: string;
      error: Error;
      retry: () => void;
    };
  };
  step3awaitingConfirmations?: {
    txData: TxDataType;
    error?: {
      title: string;
      error: Error;
      retry: () => void;
    };
  };
  step4claim?: {
    waitingForWatchtowerClaim: boolean;
    claim: {
      onClick: () => void;
      loading: boolean;
      disabled: boolean;
    };
    error?: {
      title: string;
      error: Error;
      type: 'warning' | 'error';
      retry?: () => void;
    };
  };
  step5?: {
    state: 'success' | 'failed' | 'expired';
  };
};

export function useSpvVaultFromBtcQuote(
  quote: SpvFromBTCSwap<any>,
  UICallback: (quote: ISwap, state: SwapPageUIState) => void,
  feeRate?: number,
  inputWalletBalance?: bigint
): SpvVaultFromBtcPage {
  const UICallbackRef = useStateRef(UICallback);
  const intermediateWallet = useIntermediateBitcoinWallet();
  const { connectWallet, disconnectWallet } = useContext(ChainsContext);
  const bitcoinWallet = useWallet('BITCOIN', true);

  const isIntermediateWalletSelected =
    bitcoinWallet?.instance != null &&
    bitcoinWallet.instance === intermediateWallet.wallet;
  const extensionBitcoinWallet =
    bitcoinWallet != null && !isIntermediateWalletSelected
      ? bitcoinWallet
      : undefined;
  const useBitcoinWallet: IBitcoinWallet = bitcoinWallet?.instance ?? intermediateWallet.wallet;

  const [swapMode, setSwapMode] = useState<SpvFromBTCSwapMode>(
    quote.getSwapMode()
  );
  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(
    quote,
    (state: SpvFromBTCSwapState) => {
      setSwapMode(quote.getSwapMode());
      if (
        state === SpvFromBTCSwapState.CREATED ||
        state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED ||
        state === SpvFromBTCSwapState.QUOTE_EXPIRED
      ) return;
      if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
    }
  );

  const smartChainWallet = useSmartChainWallet(quote, undefined, false);

  const [txData, setTxData] = useState<TxDataType>(null);
  const [onSend, sendLoading, sendSuccess, sendError] = useAsync(
    async () => {
      if (UICallbackRef.current) UICallbackRef.current(quote, 'lock');
      try {
        const result = await quote.sendBitcoinTransaction(
          useBitcoinWallet,
          useBitcoinWallet !== intermediateWallet.wallet && feeRate != null
            ? Math.max(feeRate, quote.minimumBtcFeeRate)
            : undefined
        );
        if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
        return result;
      } catch (error) {
        if (UICallbackRef.current) {
          const state = quote.getState();
          if (
            state === SpvFromBTCSwapState.CREATED ||
            state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED ||
            state === SpvFromBTCSwapState.QUOTE_EXPIRED
          ) UICallbackRef.current(quote, 'show');
        }
        throw error;
      }
    },
    [quote, feeRate, useBitcoinWallet, intermediateWallet.wallet]
  );

  const requiresExternalDeposit = quote?.requiresExternalDeposit();
  const [onWaitForExternalDeposit, waitingForExternalDeposit, , externalDepositError] = useAsync(async (abortSignal: AbortSignal) => {
    try {
      await quote.waitForExternalDeposit(
        intermediateWallet.wallet,
        undefined,
        5,
        undefined,
        abortSignal
      );
      if (abortSignal.aborted || quote.getSwapMode() !== 'intermediate_wallet') return;

      await intermediateWallet.refreshBalance();
      if (abortSignal.aborted || quote.getSwapMode() !== 'intermediate_wallet') return;

      void onSend();
    } catch (error) {
      if (abortSignal.aborted) return;
      if (error instanceof InvalidBitcoinDepositError) {
        await intermediateWallet.refreshBalance();
      }
      throw error;
    }
  }, [quote, intermediateWallet.wallet, intermediateWallet.refreshBalance, onSend]);

  const connectBrowserWalletAndPay = useCallback(async () => {
    const connected = await connectWallet('BITCOIN');
    if (!connected) return false;
    setCallPayFlag(true);
  }, [connectWallet]);

  const useExternalWallet = useCallback(async () => {
    await disconnectWallet('BITCOIN').catch(e => console.error('Unable to disconnect bitcoin wallet: ', e));
  }, [disconnectWallet]);

  const abortSignalRef = useAbortSignalRef([quote]);

  const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
    return quote.waitForBitcoinTransaction(
      (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
        if (txId == null) {
          setTxData(null);
          return;
        }
        setTxData({
          txId,
          confirmations: {
            actual: confirmations,
            required: confirmationTarget
          },
          eta: txEtaMs != null ? {
            millis: txEtaMs,
            text: txEtaMs === -1 || txEtaMs > 60 * 60 * 1000
              ? '>1 hour'
              : '~' + getDeltaText(txEtaMs)
          } : undefined,
        });
      },
      undefined,
      abortSignalRef.current
    );
  }, [quote]);

  const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
    return quote.claim(smartChainWallet.instance);
  }, [quote, smartChainWallet]);

  useEffect(() => {
    if (state === SpvFromBTCSwapState.POSTED || state === SpvFromBTCSwapState.BROADCASTED) {
      onWaitForPayment();
    }
  }, [state]);

  //Open mnemonic backup modal automatically on intermediate wallet quotes
  useEffect(() => {
    if (quote.getSwapMode() === 'intermediate_wallet' && !intermediateWallet.backupAcknowledged) {
      intermediateWallet.openMnemonicBackupModal();
    }
  }, [quote]);

  //Copy address warning
  const [copyWarningModalOpened, setCopyWarningModalOpened] = useState(false);
  const [showCopyWarning, setShowCopyWarning] = useLocalStorage('crossLightning-copywarning', true);

  const hasEnoughBalance = useMemo(
    () =>
      extensionBitcoinWallet==null || inputWalletBalance == null || quote == null || quote.getInput().isUnknown
        ? true
        : inputWalletBalance >= quote.getInput().rawAmount,
    [inputWalletBalance, quote, extensionBitcoinWallet]
  );

  //Swap states
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
  const isBtcTxConfirmed = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED;
  const isClaimable = isBtcTxConfirmed && !claimLoading;
  const isClaiming = isBtcTxConfirmed && claimLoading;
  const isFailed =
    state === SpvFromBTCSwapState.FAILED ||
    state === SpvFromBTCSwapState.DECLINED ||
    state === SpvFromBTCSwapState.CLOSED;
  const isSuccess = state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED;

  //Automatic quote mode switching
  const expectedSwapMode: SpvFromBTCSwapMode | undefined = useMemo(() => {
    if(!isCreated) return undefined;
    if(extensionBitcoinWallet) return 'psbt';
    if(intermediateWallet.wallet) return 'intermediate_wallet';
  }, [isCreated, extensionBitcoinWallet, intermediateWallet]);

  const [, modeSwitchLoading, modeSwitchError, retryModeSwitch] = useWithAwait(async () => {
    if(!isCreated) return;
    if(quote.getSwapMode()===expectedSwapMode) return;

    if (expectedSwapMode==='psbt') {
      await quote.setSwapModePsbt(false);
    } else if(expectedSwapMode==='intermediate_wallet') {
      try {
        await quote.returnToIntermediateWalletSwapMode();
      } catch {
        await quote.setSwapModeIntermediateWallet(intermediateWallet.wallet, undefined, feeRate);
      }
    }
  }, [quote, expectedSwapMode, intermediateWallet.wallet, isCreated], false);

  //Automatic payment when switching to extension wallet
  const onSendRef = useStateRef(onSend);
  const [callPayFlag, setCallPayFlag] = useState<boolean>(false);
  useEffect(() => {
    if (!callPayFlag || swapMode!=="psbt" || modeSwitchLoading || extensionBitcoinWallet?.instance == null) return;
    setCallPayFlag(false);
    void onSendRef.current();
  }, [callPayFlag, extensionBitcoinWallet?.instance, swapMode, modeSwitchLoading]);

  //Automatic external deposit waiting
  const [externalDepositRetry, setExternalDepositRetry] = useState(0);
  useEffect(() => {
    if (externalDepositError!=null && externalDepositError instanceof InvalidBitcoinDepositError) return;
    if (!isCreated || !requiresExternalDeposit) return;

    const abortController = new AbortController();
    onWaitForExternalDeposit(abortController.signal);
    return () => abortController.abort();
  }, [isCreated, requiresExternalDeposit, externalDepositRetry, onWaitForExternalDeposit, externalDepositError]);

  //Automatic settlement await
  const isAlreadyClaimable = useMemo(
    () => quote?.isClaimable(),
    [quote]
  );
  const [waitForSettlement, settlementWaiting, settlementSuccess, settlementError] = useAsync(() => {
    return quote.waitTillClaimedOrFronted(60, abortSignalRef.current);
  }, [quote]);
  useEffect(() => {
    if(!isAlreadyClaimable && isBtcTxConfirmed) {
      waitForSettlement();
    }
  }, [isAlreadyClaimable, isBtcTxConfirmed]);
  const isWaitingForWatchtowerClaim =
    !isAlreadyClaimable && isClaimable && settlementSuccess==null;

  /*
    Steps:
    1. Bitcoin payment -> Signing bitcoin transaction -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
    2. Claim transaction -> Sending claim transaction -> Claim success
     */
  const executionSteps: SingleStep[] = [
    { icon: bitcoin, text: 'Bitcoin payment', type: 'loading' },
    {
      icon: ic_receipt,
      text: 'Automatic settlement',
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
      text: 'Awaiting bitcoin transaction',
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
      icon: ic_check_outline,
      text: 'Bitcoin confirmed',
      type: 'success',
    };
  if (isFailed)
    executionSteps[0] = {
      icon: ic_refresh,
      text: 'Bitcoin payment reverted',
      type: 'failed',
    };

  if (isClaimable) {
    if (isWaitingForWatchtowerClaim) {
      executionSteps[1] = {
        icon: ic_hourglass_top_outline,
        text: 'Waiting automatic settlement',
        type: 'loading',
      };
    } else {
      executionSteps[1] = {
        icon: ic_receipt,
        text: 'Manual settlement',
        type: 'loading',
      };
    }
  }
  if (isClaiming)
    executionSteps[1] = {
      icon: ic_hourglass_empty_outline,
      text: 'Sending settlement transaction',
      type: 'loading',
    };
  if (isSuccess)
    executionSteps[1] = {
      icon: ic_receipt,
      text: 'Payout success',
      type: 'success',
    };

  const backupRequired =
    swapMode === 'intermediate_wallet' &&
    !intermediateWallet.backupAcknowledged;

  const expectedExternalDeposit = requiresExternalDeposit
    ? quote.getExternalDepositAmount()
    : undefined;

  const step1init = useMemo<SpvVaultFromBtcPage['step1init']>(() => {
    if (!isCreated) return undefined;

    const invalidDeposits = externalDepositError instanceof InvalidBitcoinDepositError
      ? externalDepositError.invalidUtxos
      : undefined;

    let error: SpvVaultFromBtcPage['step1init']['error'];
    if (!backupRequired) {
      if (invalidDeposits?.length > 0) {
        const reason = invalidDeposits[0].reason;
        error = {
          title:
            invalidDeposits.length > 1
              ? 'Multiple Bitcoin deposits received'
              : reason === 'amount_too_small'
                ? 'BTC amount too low'
                : reason === 'amount_too_large'
                  ? 'BTC amount too high'
                  : 'Bitcoin deposit fee too low',
          description:
            invalidDeposits.length > 1
              ? 'Multiple deposits were received. Please create a fresh quote from the deposited wallet balance.'
              : reason === 'deposit_fee_too_low'
                ? 'The received UTXO cannot fund the Bitcoin transaction fee required by this quote. Please create a fresh quote.'
                : 'The received deposit does not match the exact amount required by this quote. Please create a fresh quote from the deposited wallet balance.',
          error: externalDepositError,
          type: 'error',
          requiresRequote: true,
        };
      } else if (externalDepositError != null) {
        error = {
          title: 'Connection problem',
          description: 'Error occurred while waiting for the Bitcoin deposit, please retry.',
          error: externalDepositError,
          type: 'warning',
          retry: () => setExternalDepositRetry((value) => value + 1),
        };
      } else if (sendError != null) {
        error = {
          title: 'Failed to send Bitcoin transaction',
          error: sendError,
          type: 'error',
          retry: onSend,
        };
      } else if (modeSwitchError != null) {
        error = {
          title: 'Failed to switch Bitcoin payment mode',
          error: modeSwitchError,
          type: 'error',
          retry: retryModeSwitch
        };
      }
    }

    const walletConnected = !backupRequired && !requiresExternalDeposit
      ? {
        bitcoinWallet: extensionBitcoinWallet,
        hasEnoughBalance,
        payWithBrowserWallet: {
          loading: sendLoading,
          onClick: onSend,
          disabled: sendLoading || !hasEnoughBalance
        },
        useExternalWallet: extensionBitcoinWallet == null
          ? undefined
          : {
            onClick: useExternalWallet,
          },
      }
      : undefined;

    const walletDisconnected = !backupRequired && requiresExternalDeposit
      ? {
        address: {
          value: quote.getAddress(),
          hyperlink: quote.getHyperlink(),
          copy: () => {
            if (!showCopyWarning) {
              navigator.clipboard.writeText(quote.getAddress());
              return true;
            }
            setCopyWarningModalOpened(true);
            return false;
          },
        },
        addressCopyWarningModal: copyWarningModalOpened
          ? {
            btcAmount: expectedExternalDeposit,
            close: (accepted: boolean) => {
              if (accepted) {
                navigator.clipboard.writeText(quote.getAddress());
              }
              setCopyWarningModalOpened(false);
            },
            showAgain: {
              checked: showCopyWarning,
              onChange: setShowCopyWarning,
            },
          }
          : undefined,
        payWithBitcoinWallet: {
          onClick: () => {
            window.location.href = quote.getHyperlink();
          },
        },
        payWithBrowserWallet: {
          loading: sendLoading || modeSwitchLoading,
          onClick: connectBrowserWalletAndPay,
        },
        depositStatus: {
          expectedAmount: expectedExternalDeposit,
          invalidDeposits,
        }
      }
      : undefined;

    return {
      backupRequired: backupRequired
        ? {
            backup: intermediateWallet.openMnemonicBackupModal,
          }
        : undefined,
      walletConnected,
      walletDisconnected,
      error,
      expiry: {
        remaining: quoteTimeRemaining,
        total: totalQuoteTime,
      },
    };
  }, [
    isCreated,
    backupRequired,
    externalDepositError,
    sendError,
    extensionBitcoinWallet,
    onSend,
    modeSwitchError,
    modeSwitchLoading,
    retryModeSwitch,
    sendLoading,
    useExternalWallet,
    requiresExternalDeposit,
    expectedExternalDeposit,
    quote,
    showCopyWarning,
    copyWarningModalOpened,
    setShowCopyWarning,
    connectBrowserWalletAndPay,
    intermediateWallet.openMnemonicBackupModal,
    quoteTimeRemaining,
    totalQuoteTime,
    hasEnoughBalance
  ]);

  const step2broadcasting = useMemo(
    () =>
      !isBroadcasting
        ? undefined
        : {
            error:
              waitPaymentError != null
                ? {
                    title: 'Connection problem',
                    error: waitPaymentError,
                    retry: onWaitForPayment,
                  }
                : undefined,
          },
    [isBroadcasting, waitPaymentError, onWaitForPayment]
  );

  const step3awaitingConfirmations = useMemo(
    () =>
      !isReceived
        ? undefined
        : {
          txData: waitPaymentError == null ? txData : undefined,
          error:
            waitPaymentError != null
              ? {
                title: 'Connection problem',
                error: waitPaymentError,
                retry: onWaitForPayment,
              }
              : undefined,
        },
    [isReceived, txData, waitPaymentError, onWaitForPayment]
  );

  const step4claim = useMemo(
    () =>
      !isClaimable && !isClaiming
        ? undefined
        : {
            waitingForWatchtowerClaim: isWaitingForWatchtowerClaim,
            claim: {
              onClick: onClaim,
              loading: claimLoading,
              disabled: claimLoading,
            },
            error: claimError != null
              ? {
                title: 'Failed to manually settle',
                error: claimError,
                type: 'error' as const,
              }
              : settlementError
                ? {
                  title: 'Connection problem',
                  error: settlementError,
                  type: 'warning' as const,
                  retry: waitForSettlement,
                }
                : undefined,
          },
    [
      isClaimable,
      isClaiming,
      onClaim,
      claimLoading,
      claimError,
      settlementError,
      isWaitingForWatchtowerClaim
    ]
  );

  const step5 = useMemo(
    () =>
      !isSuccess && !isFailed && !isQuoteExpired
        ? undefined
        : {
            state: isSuccess
              ? ('success' as const)
              : isFailed
                ? ('failed' as const)
                : ('expired' as const),
          },
    [isSuccess, isFailed, isQuoteExpired]
  );

  return {
    executionSteps: isInitiated && !isCreated ? executionSteps : undefined,
    step1init,
    step2broadcasting,
    step3awaitingConfirmations,
    step4claim,
    step5,
  };
}
