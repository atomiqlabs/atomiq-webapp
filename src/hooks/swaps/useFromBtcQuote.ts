import {FromBTCSwap, FromBTCSwapState, ISwap, TokenAmount} from "@atomiqlabs/sdk";
import {useContext, useEffect, useMemo, useState} from "react";
import {ChainsContext} from "../../context/ChainsContext";
import {useChain} from "../chains/useChain";
import {useSmartChainWallet} from "../wallets/useSmartChainWallet";
import {useAsync} from "../utils/useAsync";
import {useStateRef} from "../utils/useStateRef";
import {useAbortSignalRef} from "../utils/useAbortSignal";
import {SingleStep} from "../../components/swaps/StepByStep";

import { ic_gavel_outline } from 'react-icons-kit/md/ic_gavel_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';

import {useLocalStorage} from "../utils/useLocalStorage";
import {Chain} from "../../providers/ChainsProvider";
import {getDeltaText} from "../../utils/Utils";
import {SwapPageUIState} from "../pages/useSwapPage";
import {TxDataType} from "../../types/swaps/TxDataType";
import {ExtensionBitcoinWallet} from "../../wallets/bitcoin/base/ExtensionBitcoinWallet";
import {useSwapState} from "./helpers/useSwapState";
import {useCheckAdditionalGas} from "./helpers/useCheckAdditionalGas";

export type FromBtcQuotePage = {
  executionSteps?: SingleStep[];
  //Additional gas required to go through with the swap, used for the not enough for gas notice
  additionalGasRequired?: TokenAmount;
  step1init?: {
    //Need to connect a smart chain wallet with the same address as in quote
    invalidSmartChainWallet: boolean;
    //Initiate the swap
    init?: {
      onClick: () => void;
      disabled: boolean;
      loading: boolean;
    };
    error?: {
      title: string;
      error: Error;
    };
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step2paymentWait?: {
    error?: {
      title: string;
      error: Error;
      type: "error" | "warning";
      retry?: () => void;
    };
    //Either wallet is connected and just these 2 buttons should be displayed
    walletConnected?: {
      bitcoinWallet: Chain<ExtensionBitcoinWallet>["wallet"],
      //Pay via connected browser wallet
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
      };
      //Switch to showing a QR code and using external bitcoin wallets
      useExternalWallet: {
        onClick: () => void;
      };
    };
    //Or wallet is disconnected and a QR code should be shown, with 2 buttons and autoClaim switch
    walletDisconnected?: {
      //Displayed in the QR code and in text field, call copy() when copy icon is clicked
      address: {
        value: string;
        hyperlink: string;
        copy: () => boolean;
      };
      //Display the modal warning to user to come back after payment is initiated
      addressCopyWarningModal?: {
        btcAmount: TokenAmount;
        //Close the modal with the user accepting or not
        close: (accepted: boolean) => void;
        //Data for switch about whether to show the dialog again next time
        showAgain: {
          checked: boolean;
          onChange: (checked: boolean) => void;
        };
      };
      //Pay with external bitcoin wallet by invoking a bitcoin: deeplink
      payWithBitcoinWallet: {
        onClick: () => void;
      };
      //Connect browser wallet and automatically pay after
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
      };
    };
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step3awaitingConfirmations?: {
    broadcasting: boolean,
    txData?: TxDataType,
    error?: {
      title: string,
      error: Error,
      retry: () => void
    }
  };
  step4claim?: {
    waitingForWatchtowerClaim: boolean,
    smartChainWallet?: Chain<any>["wallet"],
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
    state: "success" | "failed" | "expired";
  }
};

export function useFromBtcQuote(
  quote: FromBTCSwap<any>,
  UICallback: (quote: ISwap, state: SwapPageUIState) => void,
  feeRate?: number,
  inputWalletBalance?: bigint
): FromBtcQuotePage {
  const { disconnectWallet, connectWallet } = useContext(ChainsContext);
  const bitcoinChainData = useChain('BITCOIN');
  const bitcoinWallet = bitcoinChainData.wallet;
  const smartChainWallet = useSmartChainWallet(quote, true);

  const UICallbackRef = useStateRef(UICallback);

  const {
    state,
    totalQuoteTime,
    quoteTimeRemaining,
    isInitiated
  } = useSwapState(quote, (state: FromBTCSwapState) => {
    if(
      state === FromBTCSwapState.PR_CREATED ||
      state === FromBTCSwapState.QUOTE_SOFT_EXPIRED ||
      state === FromBTCSwapState.QUOTE_EXPIRED
    ) return;
    if(UICallbackRef.current) UICallbackRef.current(quote, "hide");
  });

  const additionalGasRequired = useCheckAdditionalGas(quote);

  const [copyWarningModalOpened, setCopyWarningModalOpened] = useState<boolean>(false);
  const [showCopyWarning, setShowCopyWarning] = useLocalStorage(
    'crossLightning-copywarning',
    true
  );

  const [payBitcoin, payLoading, payTxId, payError] = useAsync(
    () =>
      quote.sendBitcoinTransaction(
        bitcoinChainData.wallet.instance,
        feeRate === 0 ? null : feeRate
      ),
    [bitcoinChainData.wallet, feeRate, quote]
  );

  const [callPayFlag, setCallPayFlag] = useState<boolean>(false);
  useEffect(() => {
    if (!callPayFlag) return;
    setCallPayFlag(false);
    if (!bitcoinChainData.wallet) return;
    payBitcoin();
  }, [callPayFlag, bitcoinChainData.wallet, payBitcoin]);

  const isAlreadyClaimable = useMemo(
    () => (quote != null ? quote.isClaimable() : false),
    [quote]
  );

  const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(async () => {
    if(UICallbackRef.current) UICallbackRef.current(quote, "lock");
    try {
      const commitTxId = await quote.commit(smartChainWallet.instance);
      if(UICallbackRef.current) UICallbackRef.current(quote, "hide");
      if (bitcoinChainData.wallet != null) payBitcoin();
      return commitTxId;
    } catch (e) {
      if(UICallbackRef.current) UICallbackRef.current(quote, "show");
      throw e;
    }
  }, [quote, smartChainWallet, payBitcoin]);

  const abortSignalRef = useAbortSignalRef([quote]);

  const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(
    () =>
      quote.waitForBitcoinTransaction(
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
      ),
    [quote]
  );

  const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
    return quote.claim(smartChainWallet.instance);
  }, [quote, smartChainWallet]);

  const [txData, setTxData] = useState<TxDataType | null>(null);

  const [claimable, setClaimable] = useState(false);
  useEffect(() => {
    if (state === FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) {
      onWaitForPayment();
    }

    let timer: NodeJS.Timeout = null;
    if (state === FromBTCSwapState.BTC_TX_CONFIRMED) {
      timer = setTimeout(() => {
        setClaimable(true);
      }, 20 * 1000);
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
    state === FromBTCSwapState.QUOTE_EXPIRED ||
    (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && !commitLoading);
  const isCreated =
    state === FromBTCSwapState.PR_CREATED ||
    (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && commitLoading);
  const isCommited = state === FromBTCSwapState.CLAIM_COMMITED && txData == null && !(!!bitcoinWallet && !!payTxId);
  const isBroadcasting = state === FromBTCSwapState.CLAIM_COMMITED && txData == null && !!bitcoinWallet && !!payTxId;
  const isReceived =
    state === (FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) &&
    txData != null;
  const isClaimable = state === FromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
  const isClaiming = state === FromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
  const isExpired = state === FromBTCSwapState.EXPIRED && txData == null;
  const isFailed = state === FromBTCSwapState.FAILED;
  const isSuccess = state === FromBTCSwapState.CLAIM_CLAIMED;

  /*
    Steps:
    1. Opening swap address -> Swap address opened
    2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
    3. Claim transaction -> Sending claim transaction -> Claim success
     */
  const executionSteps: SingleStep[] = [
    {
      icon: ic_check_outline,
      text: 'Swap address opened',
      type: 'success',
    },
    { icon: bitcoin, text: 'Bitcoin payment', type: 'disabled' },
    {
      icon: ic_receipt,
      text: 'Automatic settlement',
      type: 'disabled',
    },
  ];

  if(isCreated) {
    if(commitError) {
      executionSteps[0] = {
        icon: ic_warning,
        text: 'Transaction didn’t confirm',
        type: 'failed',
      };
    } else if(commitLoading) {
      executionSteps[0] = {
        icon: ic_hourglass_empty_outline,
        text: 'Opening swap address',
        type: 'loading',
      };
    } else {
      executionSteps[0] = {
        icon: ic_gavel_outline,
        text: 'Open swap address',
        type: 'loading',
      };
    }
  }

  if (isQuoteExpired)
    executionSteps[0] = {
      icon: ic_hourglass_disabled_outline,
      text: 'Quote expired',
      type: 'failed',
    };

  if (isCommited || isBroadcasting)
    executionSteps[1] = {
      icon: bitcoin,
      text: 'Awaiting bitcoin payment',
      type: 'loading',
    };

  if (isReceived)
    executionSteps[1] = {
      icon: ic_hourglass_top_outline,
      text: 'Waiting bitcoin confirmations',
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

  if (isClaimable) {
    if(claimable || isAlreadyClaimable) {
      executionSteps[2] = {
        icon: ic_receipt,
        text: 'Claim transaction',
        type: 'loading',
      };
    } else {
      executionSteps[2] = {
        icon: ic_receipt,
        text: 'Waiting automatic settlement',
        type: 'loading',
      };
    }
  }
  if (isClaiming)
    executionSteps[2] = {
      icon: ic_hourglass_empty_outline,
      text: 'Sending claim transaction',
      type: 'loading',
    };
  if (isSuccess)
    executionSteps[2] = {
      icon: ic_check_outline,
      text: 'Payout success',
      type: 'success',
    };

  const step1init = useMemo(() => (!isCreated ? undefined : {
    invalidSmartChainWallet: smartChainWallet==null,
    init: !additionalGasRequired ? {
      onClick: onCommit,
      disabled: commitLoading || !hasEnoughBalance,
      loading: commitLoading
    } : undefined,
    error: commitError ? {
      title: "Swap initialization error",
      error: commitError
    } : undefined,
    expiry: {
      remaining: quoteTimeRemaining,
      total: totalQuoteTime,
    }
  }), [
    isCreated,
    smartChainWallet,
    onCommit,
    commitLoading,
    hasEnoughBalance,
    additionalGasRequired,
    commitError,
    quoteTimeRemaining,
    totalQuoteTime
  ]);

  const step2paymentWait = useMemo(() => (!isCommited ? undefined : {
    error: waitPaymentError || (payError && bitcoinWallet) ? {
      title: waitPaymentError ? "Connection problem" : "Bitcoin transaction error",
      error: waitPaymentError ? waitPaymentError : payError,
      type: waitPaymentError ? ("warning" as const) : ("error" as const),
      retry: waitPaymentError ? onWaitForPayment : undefined
    } : undefined,
    //Either wallet is connected and just these 2 buttons should be displayed
    walletConnected: bitcoinWallet != null && waitingPayment ? {
      bitcoinWallet,
      //Pay via connected browser wallet
      payWithBrowserWallet: {
        loading: payLoading,
        onClick: () => {
          payBitcoin();
        }
      },
      //Switch to showing a QR code and using external bitcoin wallets
      useExternalWallet: {
        onClick: () => {
          disconnectWallet('BITCOIN')
        },
      },
    } : undefined,
    //Or wallet is disconnected and a QR code should be shown, with 2 buttons and autoClaim switch
    walletDisconnected: bitcoinWallet == null && waitingPayment ? {
      //Displayed in the QR code and in text field
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
        }
      },
      //Display the modal warning to user to come back after payment is initiated
      addressCopyWarningModal: copyWarningModalOpened ? {
        btcAmount: quote.getInput(),
        //Close the modal with the user accepting or not (will only copy the address if user accepted!)
        close: (accepted: boolean) => {
          if(accepted) navigator.clipboard.writeText(quote.getAddress());
          setCopyWarningModalOpened(false);
        },
        //Data for switch about whether to show the dialog again next time
        showAgain: {
          checked: showCopyWarning,
          onChange: setShowCopyWarning,
        }
      } : undefined,
      //Pay with external bitcoin wallet by invoking a bitcoin: deeplink
      payWithBitcoinWallet: {
        onClick: () => {
          window.location.href = quote.getHyperlink();
        }
      },
      //Connect browser wallet and automatically pay after
      payWithBrowserWallet: {
        loading: payLoading,
        onClick: () => {
          connectWallet('BITCOIN').then((success) => {
            //Call pay on next state update
            if (success) setCallPayFlag(true);
          });
        }
      }
    } : undefined,
    expiry: {
      remaining: quoteTimeRemaining,
      total: totalQuoteTime
    }
  }), [
    isCommited,
    waitPaymentError,
    waitingPayment,
    bitcoinWallet,
    payError,
    payLoading,
    payBitcoin,
    disconnectWallet,
    quote,
    showCopyWarning,
    copyWarningModalOpened,
    quoteTimeRemaining,
    totalQuoteTime
  ]);

  const step3awaitingConfirmations = useMemo(() => (!isReceived && !isBroadcasting ? undefined : {
    broadcasting: !waitPaymentError ? isBroadcasting : undefined,
    txData: !waitPaymentError ? txData : undefined,
    error: waitPaymentError ? {
      title: "Connection error",
      error: waitPaymentError,
      retry: onWaitForPayment
    } : undefined
  }), [
    isReceived,
    isBroadcasting,
    bitcoinWallet,
    payTxId,
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

  const step5 = useMemo(() => (!isSuccess && !isFailed && !isQuoteExpired && !isExpired ? undefined : {
    state: isSuccess
      ? "success" as const
      : (isFailed || isExpired)
        ? "failed" as const
        : "expired" as const
  }), [
    isSuccess,
    isFailed,
    isQuoteExpired
  ]);

  return {
    additionalGasRequired: isCreated || isQuoteExpired ? additionalGasRequired : undefined,
    executionSteps: isInitiated && !isCreated ? executionSteps : undefined,
    step1init,
    step2paymentWait,
    step3awaitingConfirmations,
    step4claim,
    step5
  };

}
