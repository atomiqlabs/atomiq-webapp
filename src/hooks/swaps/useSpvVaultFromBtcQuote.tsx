import {SingleStep} from '../../components/swaps/StepByStep';
import {Chain} from '../../providers/ChainsProvider';
import {
  BitcoinTokens,
  ISwap,
  SpvFromBTCSwap,
  SpvFromBTCSwapDepositState,
  SpvFromBTCSwapDepositStatus,
  SpvFromBTCSwapState
} from '@atomiqlabs/sdk';
import {useContext, useEffect, useMemo, useState} from 'react';
import {useStateRef} from '../utils/useStateRef';
import {useSmartChainWallet} from '../wallets/useSmartChainWallet';
import {useAsync} from '../utils/useAsync';
import {useAbortSignalRef} from '../utils/useAbortSignal';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_hourglass_empty_outline} from 'react-icons-kit/md/ic_hourglass_empty_outline';
import {ic_check_outline} from 'react-icons-kit/md/ic_check_outline';
import {bitcoin} from 'react-icons-kit/fa/bitcoin';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_receipt} from 'react-icons-kit/md/ic_receipt';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {getDeltaText} from '../../utils/Utils';
import {SwapPageUIState} from '../pages/useSwapPage';
import {TxDataType} from "../../types/swaps/TxDataType";
import {ExtensionBitcoinWallet} from "../../wallets/bitcoin/base/ExtensionBitcoinWallet";
import {useSwapState} from "./helpers/useSwapState";
import {useWallet} from "../wallets/useWallet";
import {ChainsContext} from "../../context/ChainsContext";
import {useLocalStorage} from "../utils/useLocalStorage";
import {toHumanReadable} from "../../utils/Tokens";

type DepositTxIssue = {
  type: 'underpaid' | 'overpaid' | 'bad_network_fee';
  title: string;
  description: string | JSX.Element;
};

function formatDepositedAmount(actualAmount?: number): string {
  if (actualAmount == null) return 'unknown';
  return `${toHumanReadable(BigInt(actualAmount), BitcoinTokens.BTC).toFixed(8)} BTC`;
}

function formatNetworkFeeRate(actualFeeRate?: number): string {
  if (actualFeeRate == null) return 'unknown';
  return `${actualFeeRate.toFixed(2)} sats/vB`;
}

function getDepositTxIssue(
  depositStatus: SpvFromBTCSwapDepositStatus | null | undefined
): DepositTxIssue | undefined {
  if (depositStatus == null) return undefined;
  switch (depositStatus.state) {
    case SpvFromBTCSwapDepositState.UNDERPAID:
      return {
        type: 'underpaid',
        title: 'Bitcoin payment too low',
        description: (
          <>
            <div>Received amount: <strong>{formatDepositedAmount(depositStatus.actualAmount)}</strong></div>
            <div>
              The received BTC amount is lower than required for this quote. Please request a new
              quote with the available amount.
            </div>
          </>
        ),
      };
    case SpvFromBTCSwapDepositState.OVERPAID:
      return {
        type: 'overpaid',
        title: 'Bitcoin payment too high',
        description: (
          <>
            <div>Received amount: <strong>{formatDepositedAmount(depositStatus.actualAmount)}</strong></div>
            <div>
              The received BTC amount is higher than required for this quote. Please request a new
              quote for this amount.
            </div>
          </>
        ),
      };
    case SpvFromBTCSwapDepositState.BAD_NETWORK_FEE:
      return {
        type: 'bad_network_fee',
        title: 'Bitcoin transaction fee too low',
        description: (
          <>
            <div>Paid network fee rate: <strong>{formatNetworkFeeRate(depositStatus.actualFeeRate)}</strong></div>
            <div>
              The received BTC transaction paid too little network fee for this quote. Please
              request a new quote and retry.
            </div>
          </>
        ),
      };
    default:
      return undefined;
  }
}

export type SpvVaultFromBtcPage = {
  executionSteps?: SingleStep[];
  step1init?: {
    bitcoinWallet?: Chain<ExtensionBitcoinWallet>['wallet'];
    hasEnoughBalance?: boolean;
    init?: {
      onClick: () => void;
      loading: boolean;
      disabled: boolean;
    };
    error?: {
      title: string;
      error: Error;
    };
    expiry?: {
      remaining: number;
      total: number;
    };
    //Display the modal warning to the user to back up the phrase
    backupWarningModal?: {
      //Close the modal with the user accepting or not
      close: (accepted: boolean) => void;
      //Data for switch about whether to show the dialog again next time
      showAgain: {
        checked: boolean;
        onChange: (checked: boolean) => void;
      };
    };
  };
  step2paymentWait?: {
    error?: {
      title: string;
      error: Error;
      type: "error" | "warning";
      retry?: () => void;
    };
    //Displayed in the QR code and in text field, call copy() when copy icon is clicked
    address: {
      value: string;
      hyperlink: string;
      copy: () => boolean;
    };
    //Pay with external bitcoin wallet by invoking a bitcoin: deeplink
    payWithBitcoinWallet: {
      onClick: () => void;
    };
    //Connect browser wallet
    payWithBrowserWallet: {
      loading: boolean;
      onClick: () => void;
    };
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step3awaitingConfirmations?: {
    broadcasting: boolean,
    txData?: TxDataType;
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
    state: 'success' | 'failed' | 'expired' | 'expired_uninitialized' | 'deposit_error';
    depositIssue?: DepositTxIssue;
  };
};

export function useSpvVaultFromBtcQuote(
  quote: SpvFromBTCSwap<any>,
  UICallback: (quote: ISwap, state: SwapPageUIState) => void,
  feeRate?: number,
  inputWalletBalance?: bigint,
  abortSwap?: () => void
): SpvVaultFromBtcPage {
  const { connectWallet } = useContext(ChainsContext);
  const UICallbackRef = useStateRef(UICallback);
  const abortSwapRef = useStateRef(abortSwap);
  const [depositStatus, setDepositStatus] = useState<SpvFromBTCSwapDepositStatus | null>(
    quote?.getDepositStatus() ?? null
  );

  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(
    quote,
    (state: SpvFromBTCSwapState) => {
      setDepositStatus(quote?.getDepositStatus?.() ?? null);
      if (
        state === SpvFromBTCSwapState.CREATED ||
        state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED ||
        state === SpvFromBTCSwapState.QUOTE_EXPIRED
      ) return;
      if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
    }
  );

  const bitcoinWallet = useWallet('BITCOIN', true);
  const smartChainWallet = useSmartChainWallet(quote, undefined, false);

  const [backupWarningModalOpened, setBackupWarningModalOpened] = useState<boolean>(false);
  const [backupWarning, setBackupWarning] = useLocalStorage(
    'crossLightning-backupwarning',
    true
  );

  const abortSignalRef = useAbortSignalRef([quote]);

  const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => {
    if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
    return quote.waitForPayment(undefined, abortSignalRef.current);
  }, [quote]);

  const [onSend, sendLoading, sendSuccess, sendError] = useAsync(() => {
    if (UICallbackRef.current) UICallbackRef.current(quote, 'lock');
    return quote
      .sendBitcoinTransaction(
        bitcoinWallet.instance,
        feeRate != null ? Math.max(feeRate, quote.minimumBtcFeeRate) : undefined
      )
      .then((val) => {
        if (UICallbackRef.current) UICallbackRef.current(quote, 'hide');
        return val;
      })
      .catch((e) => {
        if (UICallbackRef.current) {
          const state = quote.getState();
          if (
            state === SpvFromBTCSwapState.CREATED ||
            state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED ||
            state === SpvFromBTCSwapState.QUOTE_EXPIRED
          ) UICallbackRef.current(quote, 'show');
        }
        throw e;
      });
  }, [quote, bitcoinWallet, feeRate]);

  const [txData, setTxData] = useState<TxDataType>(null);

  const [onWaitForBitcoinTx, waitingBitcoinTx, waitBitcoinTxSuccess, waitBitcoinTxError] = useAsync(() => {
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
      onWaitForBitcoinTx();
    }
  }, [state]);

  const hasEnoughBalance = useMemo(
    () =>
      inputWalletBalance == null || quote == null
        ? true
        : inputWalletBalance >= quote.getInput().rawAmount,
    [inputWalletBalance, quote]
  );
  const hasDepositIssue =
    depositStatus != null &&
    depositStatus.state < SpvFromBTCSwapDepositState.UNFUNDED;

  const isQuoteExpired =
    state === SpvFromBTCSwapState.QUOTE_EXPIRED ||
    (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && !sendLoading && !waitingBitcoinTx && !waitingPayment);
  const _isCreated =
    (state === SpvFromBTCSwapState.CREATED ||
    (state === SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED && (sendLoading || waitingPayment)))
  const isCreated = quote.getDepositWalletType()==="waitpayment"
    ? (_isCreated && !isInitiated) :
    _isCreated;
  const isSending = state === SpvFromBTCSwapState.CREATED && sendLoading;
  const isWaitingPayment =
    isInitiated &&
    _isCreated &&
    quote.getDepositWalletType()==="waitpayment" &&
    !hasDepositIssue;
  const isBroadcasting =
    state === SpvFromBTCSwapState.SIGNED ||
    state === SpvFromBTCSwapState.POSTED ||
    (state === SpvFromBTCSwapState.BROADCASTED && txData == null);
  const isBroadcasted = state === SpvFromBTCSwapState.BROADCASTED && txData != null;
  const isBtcTxConfirmed = state === SpvFromBTCSwapState.BTC_TX_CONFIRMED;
  const isClaimable = isBtcTxConfirmed && !claimLoading;
  const isClaiming = isBtcTxConfirmed && claimLoading;
  const isFailed =
    state === SpvFromBTCSwapState.FAILED ||
    state === SpvFromBTCSwapState.DECLINED ||
    state === SpvFromBTCSwapState.CLOSED;
  const isSuccess = state === SpvFromBTCSwapState.CLAIMED || state === SpvFromBTCSwapState.FRONTED;

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
  if (isBroadcasted)
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

  if (depositStatus?.state === SpvFromBTCSwapDepositState.UNDERPAID)
    executionSteps[0] = {
      icon: ic_refresh,
      text: 'Bitcoin payment too low',
      type: 'failed',
    };
  if (depositStatus?.state === SpvFromBTCSwapDepositState.OVERPAID)
    executionSteps[0] = {
      icon: ic_refresh,
      text: 'Bitcoin payment too high',
      type: 'failed',
    };
  if (depositStatus?.state === SpvFromBTCSwapDepositState.BAD_NETWORK_FEE)
    executionSteps[0] = {
      icon: ic_refresh,
      text: 'Bitcoin network fee too low',
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

  const step1init = useMemo(
    () =>
      !isCreated
        ? undefined
        : {
            bitcoinWallet: bitcoinWallet,
            hasEnoughBalance,
            init:
              bitcoinWallet != null
                ? {
                    onClick: onSend,
                    loading: sendLoading,
                    disabled: sendLoading || !hasEnoughBalance,
                  }
                : quote.getDepositWalletType()==="waitpayment"
                  ? {
                    onClick: () => {
                      if(backupWarning) {
                        setBackupWarningModalOpened(true);
                      } else {
                        onWaitForPayment();
                      }
                    },
                    loading: backupWarningModalOpened,
                    disabled: backupWarningModalOpened
                  }
                  : undefined,
            error:
              sendError != null
                ? {
                    title: 'Failed to send Bitcoin transaction',
                    error: sendError,
                  }
                : undefined,
            expiry:
              hasEnoughBalance && !sendLoading
                ? {
                    remaining: quoteTimeRemaining,
                    total: totalQuoteTime,
                  }
                : undefined,
            backupWarningModal:
              !backupWarningModalOpened
                ? undefined
                : {
                  close: (accepted: boolean) => {
                    setBackupWarningModalOpened(false);
                    if(accepted) onWaitForPayment();
                  },
                  showAgain: {
                    checked: backupWarning,
                    onChange: setBackupWarning
                  }
                }
          },
    [
      isCreated,
      bitcoinWallet,
      hasEnoughBalance,
      backupWarningModalOpened,
      backupWarning,
      onWaitForPayment,
      onSend,
      sendError,
      sendLoading,
      quoteTimeRemaining,
      totalQuoteTime,
    ]
  );

  const step2paymentWait = useMemo(
    () =>
      !isWaitingPayment
        ? undefined
        : {
          error:
            waitPaymentError != null
              ? {
                title: 'Connection problem',
                type: 'warning' as const,
                error: waitPaymentError,
                retry: onWaitForPayment,
              }
              : undefined,
          address: {
            value: quote.getAddress(),
            hyperlink: quote.getHyperlink(),
            copy: () => {
              navigator.clipboard.writeText(quote.getAddress());
              return true;
            }
          },
          payWithBitcoinWallet: {
            onClick: () => {
              window.location.href = quote.getHyperlink();
            }
          },
          //Connect browser wallet and automatically pay after
          payWithBrowserWallet: {
            loading: false,
            onClick: () => {
              connectWallet('BITCOIN').then((success) => {
                //Abort the current swap and create a new one
                if(success) {
                  if(abortSwapRef.current!=null) abortSwapRef.current();
                }
              });
            }
          },
          expiry: {
            remaining: quoteTimeRemaining,
            total: totalQuoteTime,
          }
        },
    [isWaitingPayment, waitPaymentError, onWaitForPayment, quote, quoteTimeRemaining, totalQuoteTime, connectWallet]
  );

  const step3awaitingConfirmations = useMemo(
    () =>
      !isBroadcasted && !isBroadcasting
        ? undefined
        : {
          broadcasting: !waitBitcoinTxError ? isBroadcasting : undefined,
          txData: waitBitcoinTxError == null ? txData : undefined,
          error:
            waitBitcoinTxError != null
              ? {
                title: 'Connection problem',
                error: waitBitcoinTxError,
                retry: onWaitForBitcoinTx,
              }
              : undefined,
        },
    [isBroadcasting, isBroadcasted, txData, waitBitcoinTxError, onWaitForBitcoinTx]
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
    () => {
      if (!isSuccess && !isFailed && !isQuoteExpired && !hasDepositIssue) return undefined;
      return {
        state: isSuccess
          ? ('success' as const)
          : isFailed
            ? ('failed' as const)
            : hasDepositIssue
              ? ('deposit_error' as const)
              : isInitiated
                ? ('expired' as const)
                : ('expired_uninitialized' as const),
        depositIssue: getDepositTxIssue(depositStatus)
      };
    },
    [isSuccess, isFailed, isQuoteExpired, isInitiated, depositStatus, hasDepositIssue]
  );

  return {
    executionSteps: isInitiated && !isCreated ? executionSteps : undefined,
    step1init,
    step2paymentWait,
    step3awaitingConfirmations,
    step4claim,
    step5,
  };
}
