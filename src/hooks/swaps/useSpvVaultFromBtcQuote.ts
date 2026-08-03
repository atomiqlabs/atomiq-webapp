import { SingleStep } from '../../components/swaps/StepByStep';
import { Chain } from '../../providers/ChainsProvider';
import {
  IBitcoinWallet,
  InvalidBitcoinDepositError,
  ISwap,
  SpvFromBTCSwap,
  SpvFromBTCSwapMode,
  SpvFromBTCSwapState,
  TokenAmount,
  BitcoinTokens,
  toHumanReadableString,
} from '@atomiqlabs/sdk';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
    init: {
      onClick: () => void;
      disabled: boolean;
      loading: boolean;
    };
    error?: {
      title: string;
      description?: string;
      error?: Error;
      type: 'warning' | 'error';
      retry?: () => void;
    };
    expiry: {
      remaining: number;
      total: number;
    };
    note?: {
      willExecuteAutomatically: boolean;
      requiredAdditionalDeposit?: TokenAmount;
    }
  };
  step2paymentWait?: {
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
  step3broadcasting?: {
    error?: {
      title: string;
      error: Error;
      retry: () => void;
    };
  };
  step4awaitingConfirmations?: {
    txData: TxDataType;
    error?: {
      title: string;
      error: Error;
      retry: () => void;
    };
  };
  step5claim?: {
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
  step6?: {
    state: 'success' | 'failed' | 'expired' | 'expired_uninitialized';
    errorMessage?: string;
    errorTitle?: string;
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
  const intermediateWalletRef = useStateRef(intermediateWallet);
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

  const requiresExternalDeposit = quote?.requiresExternalDeposit();
  const expectedExternalDeposit = requiresExternalDeposit
    ? quote.getExternalDepositAmount()
    : undefined;

  const [swapMode, setSwapMode] = useState<SpvFromBTCSwapMode>(
    quote.getSwapMode()
  );
  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(
    quote,
    (state: SpvFromBTCSwapState, initiated: boolean) => {
      setSwapMode(quote.getSwapMode());
      if (!initiated) return;
      if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
    }
  );
  const backupRequired =
    swapMode === 'intermediate_wallet' &&
    !intermediateWallet.backupAcknowledged;

  const smartChainWallet = useSmartChainWallet(quote, undefined, false);

  const [txData, setTxData] = useState<TxDataType>(null);
  const [onSend, sendLoading, sendSuccess, sendError, clearSendError] = useAsync(
    () => {
      if(UICallbackRef.current!=null && !quote.isInitiated()) UICallbackRef.current(quote, 'lock');
      return quote.sendBitcoinTransaction(
        useBitcoinWallet,
        useBitcoinWallet !== intermediateWalletRef.current.wallet && feeRate != null
          ? Math.max(feeRate, quote.minimumBtcFeeRate)
          : undefined
      ).catch(e => {
        console.error("useSpvVaultFromBtcQuote(): Send tx error: ", e);
        if(UICallbackRef.current!=null && !quote.isInitiated()) UICallbackRef.current(quote, 'show');
        throw e;
      });
    },
    [quote, feeRate, useBitcoinWallet]
  );

  const modeSwitchAbortSignal = useAbortSignalRef([quote, swapMode]);
  const [onWaitForExternalDeposit, waitingForExternalDeposit, , externalDepositError] = useAsync(async () => {
    const abortSignal = modeSwitchAbortSignal.current;
    try {
      await quote.waitForExternalDeposit(
        intermediateWalletRef.current.wallet,
        undefined,
        5,
        undefined,
        abortSignal
      );
      if (abortSignal.aborted || quote.getSwapMode() !== 'intermediate_wallet') return;

      await intermediateWalletRef.current.refreshBalance();
      if (abortSignal.aborted || quote.getSwapMode() !== 'intermediate_wallet') return;

      void onSend();
    } catch (error) {
      if (abortSignal.aborted) return;
      if (error instanceof InvalidBitcoinDepositError) {
        await intermediateWalletRef.current.refreshBalance();
      }
      throw error;
    }
  }, [quote, onSend]);

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
    let previousTxId: string | undefined;
    return quote.waitForBitcoinTransaction(
      (txId: string, confirmations: number, confirmationTarget: number, txEtaMs: number) => {
        if (txId == null) {
          setTxData(null);
          return;
        }
        if(previousTxId!==txId && intermediateWalletRef.current!=null) {
          void intermediateWalletRef.current.refreshBalance();
          previousTxId = txId;
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

  //Automatic wait for payment trigger
  useEffect(() => {
    if (state === SpvFromBTCSwapState.POSTED || state === SpvFromBTCSwapState.BROADCASTED) {
      onWaitForPayment();
    }
  }, [state]);

  //External deposit waiting starts when the user initiates the swap, or resumes for an initiated swap.
  useEffect(() => {
    if (quote!=null && quote.isInitiated() && quote.getState() === SpvFromBTCSwapState.CREATED) {
      if (swapMode==="intermediate_wallet" && quote.requiresExternalDeposit() && intermediateWallet.wallet!=null)
        void onWaitForExternalDeposit();
    }
  }, [quote, swapMode, intermediateWallet.wallet!=null]);

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
  const isFailedExternalDeposit =
    expectedExternalDeposit != null &&
    externalDepositError instanceof InvalidBitcoinDepositError &&
    externalDepositError.invalidUtxos?.length > 0;
  const isFailed =
    state === SpvFromBTCSwapState.FAILED ||
    state === SpvFromBTCSwapState.DECLINED ||
    state === SpvFromBTCSwapState.CLOSED ||
    isFailedExternalDeposit;
  const isQuoteExpired = !isFailed && (
    state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
    (
      state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED &&
      !sendLoading &&
      !waitingPayment
    )
  );
  const isCreated = !isFailed && (
    state === SpvFromBTCSwapState.CREATED ||
    (
      state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED &&
      sendLoading
    )
  );
  const isSending = !isFailed && state === SpvFromBTCSwapState.CREATED && sendLoading;
  const isBroadcasting = !isFailed && (
    state === SpvFromBTCSwapState.SIGNED ||
    state === SpvFromBTCSwapState.POSTED ||
    (state === SpvFromBTCSwapState.BROADCASTED && txData == null)
  );
  const isReceived = !isFailed && state === SpvFromBTCSwapState.BROADCASTED && txData != null;
  const isBtcTxConfirmed = !isFailed && state === SpvFromBTCSwapState.BTC_TX_CONFIRMED;
  const isClaimable = !isFailed && isBtcTxConfirmed && !claimLoading;
  const isClaiming = !isFailed && isBtcTxConfirmed && claimLoading;
  const isSuccess = !isFailed && (
    state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED
  );

  //Automatic quote mode switching
  const expectedSwapMode: SpvFromBTCSwapMode | undefined = useMemo(() => {
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
    clearSendError();
  }, [quote, expectedSwapMode, intermediateWallet.wallet, isCreated], false);

  //Automatic payment when switching to extension wallet
  const onSendRef = useStateRef(onSend);
  const [callPayFlag, setCallPayFlag] = useState<boolean>(false);
  useEffect(() => {
    if (!callPayFlag || swapMode!=="psbt" || modeSwitchLoading || extensionBitcoinWallet?.instance == null) return;
    setCallPayFlag(false);
    void onSendRef.current();
  }, [callPayFlag, extensionBitcoinWallet?.instance, swapMode, modeSwitchLoading]);

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
      text: isFailedExternalDeposit ? 'Invalid Bitcoin deposit' : 'Bitcoin payment reverted',
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

  const swapModeReady =
    expectedSwapMode != null &&
    swapMode === expectedSwapMode &&
    !modeSwitchLoading &&
    modeSwitchError == null;

  const initializeSwap = useCallback(() => {
    if (!swapModeReady) return;
    if (!requiresExternalDeposit && !backupRequired && !hasEnoughBalance) return;
    if (backupRequired) {
      intermediateWalletRef.current.openMnemonicBackupModal();
    }
    if (requiresExternalDeposit) {
      void onWaitForExternalDeposit();
    } else if(!backupRequired) {
      void onSend();
    }
  }, [
    swapModeReady,
    requiresExternalDeposit,
    onWaitForExternalDeposit,
    backupRequired,
    hasEnoughBalance,
    onSend
  ]);

  const initializationLoading =
    modeSwitchLoading || sendLoading || waitingForExternalDeposit;

  const step1init = useMemo<SpvVaultFromBtcPage['step1init']>(() => {
    if (!isCreated || isInitiated) return undefined;

    const error =
      modeSwitchError != null
        ? {
            title: 'Failed to switch Bitcoin payment mode',
            error: modeSwitchError,
            type: 'error' as const,
            retry: retryModeSwitch,
          }
        : externalDepositError != null
          ? {
              title: 'Connection problem',
              description: 'Error occurred while starting the Bitcoin deposit wait, please retry.',
              error: externalDepositError,
              type: 'warning' as const,
              retry: onWaitForExternalDeposit,
            }
          : sendError != null
            ? {
                title: 'Failed to send Bitcoin transaction',
                error: sendError,
                type: 'error' as const
              }
            : undefined;

    return {
      init: {
        onClick: initializeSwap,
        loading: initializationLoading,
        disabled:
          initializationLoading ||
          !swapModeReady ||
          (!requiresExternalDeposit && !backupRequired && !hasEnoughBalance),
      },
      error,
      expiry: {
        remaining: quoteTimeRemaining,
        total: totalQuoteTime,
      },
      note: swapMode==="intermediate_wallet" && (!requiresExternalDeposit || quote?.getInput().rawAmount!==expectedExternalDeposit?.rawAmount)
        ? {
          willExecuteAutomatically: !requiresExternalDeposit,
          requiredAdditionalDeposit: expectedExternalDeposit
        }
        : undefined
    };
  }, [
    isCreated,
    isInitiated,
    modeSwitchError,
    retryModeSwitch,
    externalDepositError,
    onWaitForExternalDeposit,
    sendError,
    onSend,
    initializeSwap,
    initializationLoading,
    swapModeReady,
    requiresExternalDeposit,
    backupRequired,
    hasEnoughBalance,
    quoteTimeRemaining,
    totalQuoteTime,
    swapMode,
    expectedExternalDeposit
  ]);

  const step2paymentWait = useMemo<SpvVaultFromBtcPage['step2paymentWait']>(() => {
    if (!isCreated || !isInitiated) return undefined;

    const displayWalletConnected = !backupRequired && !requiresExternalDeposit;

    let error: SpvVaultFromBtcPage['step2paymentWait']['error'];
    if (!backupRequired) {
      if (externalDepositError != null && !(externalDepositError instanceof InvalidBitcoinDepositError)) {
        error = {
          title: 'Connection problem',
          description: 'Error occurred while waiting for the Bitcoin deposit, please retry.',
          error: externalDepositError,
          type: 'warning',
          retry: onWaitForExternalDeposit,
        };
      } else if (sendError != null) {
        error = {
          title: 'Failed to send Bitcoin transaction',
          error: sendError,
          type: 'error',
          retry: displayWalletConnected ? undefined : onSend,
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

    const walletConnected = displayWalletConnected
      ? {
        bitcoinWallet: extensionBitcoinWallet,
        hasEnoughBalance,
        payWithBrowserWallet: {
          loading: sendLoading || modeSwitchLoading,
          onClick: onSend,
          disabled: sendLoading || modeSwitchLoading || !swapModeReady || !hasEnoughBalance
        },
        useExternalWallet: extensionBitcoinWallet == null
          ? undefined
          : {
            onClick: useExternalWallet,
          },
      }
      : undefined;

    const walletDisconnected = !backupRequired && requiresExternalDeposit && !sendError
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
          expectedAmount: expectedExternalDeposit
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
    isInitiated,
    backupRequired,
    externalDepositError,
    onWaitForExternalDeposit,
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
    hasEnoughBalance,
    swapModeReady
  ]);

  const step3broadcasting = useMemo(
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

  const step4awaitingConfirmations = useMemo(
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

  const step5claim = useMemo(
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

  const step6 = useMemo(() => {
    if(isSuccess) return {state: "success" as const};
    if(isQuoteExpired || isFailed) {
      let errorMessage: string | undefined;
      let errorTitle: string | undefined;

      if(isFailedExternalDeposit) {
        const invalidDeposits = externalDepositError.invalidUtxos;
        if(invalidDeposits.length > 1) {
          errorTitle = 'Multiple Bitcoin deposits received';
          errorMessage = 'Multiple Bitcoin deposits were received. Please create a new quote - your already deposited Bitcoin balance will be used!';
        } else {
          const invalidDeposit = invalidDeposits[0];
          switch(invalidDeposit.reason) {
            case "amount_too_large":
              errorTitle ??= 'BTC amount too high';
            case "amount_too_small":
              errorTitle ??= 'BTC amount too low';
              errorMessage = `The received ${toHumanReadableString(invalidDeposit.actualAmount, BitcoinTokens.BTC)} BTC deposit does not match the exact amount required by this swap. Please create a new quote - your already deposited Bitcoin balance will be used!`;
              break;
            case "deposit_fee_too_low":
              errorTitle = 'Bitcoin deposit fee too low';
              errorMessage = 'The Bitcoin deposit transaction uses a network fee that is too small to continue with this swap. Please create a new quote that takes into account this smaller deposit fee rate - your already deposited Bitcoin balance will be used!';
              break;
          }
        }
      } else if(isFailed) {
        errorTitle = 'Swap failed';
        if(swapMode==="intermediate_wallet") {
          errorMessage = 'Failed to broadcast Bitcoin swap transaction, please create a new quote and retry. Your already deposited Bitcoin balance will be used!';
        } else {
          errorMessage = 'Failed to broadcast Bitcoin swap transaction, no funds were sent, please create a new quote and retry.';
        }
      } else if(isQuoteExpired) {
        errorTitle = 'Swap expired';
        if(swapMode==="intermediate_wallet") {
          errorMessage = 'Swap has expired. If you\'ve already sent the Bitcoin payment, just create a new quote - your already deposited Bitcoin balance will be used automatically!';
        } else {
          errorMessage = 'Swap has expired, please create a new quote!';
        }
      }

      return {
        state: isFailed
          ? ('failed' as const)
          : isInitiated
            ? ('expired' as const)
            : ('expired_uninitialized' as const),
        errorMessage,
        errorTitle
      };
    }
  }, [isSuccess, isFailed, isQuoteExpired, isInitiated, isFailedExternalDeposit, externalDepositError, swapMode]);

  return {
    executionSteps: isInitiated ? executionSteps : undefined,
    step1init,
    step2paymentWait,
    step3broadcasting,
    step4awaitingConfirmations,
    step5claim,
    step6,
  };
}
