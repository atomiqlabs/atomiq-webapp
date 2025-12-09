import {FromBTCLNSwap, FromBTCLNSwapState, ISwap, TokenAmount} from '@atomiqlabs/sdk';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useStateRef } from '../utils/useStateRef';
import { useAbortSignalRef } from '../utils/useAbortSignal';
import { useAsync } from '../utils/useAsync';
import { SingleStep } from '../../components/swaps/StepByStep';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_swap_horiz } from 'react-icons-kit/md/ic_swap_horiz';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_download_outline } from 'react-icons-kit/md/ic_download_outline';
import { timeoutPromise } from '../../utils/Utils';
import { useSmartChainWallet } from '../wallets/useSmartChainWallet';
import { useChain } from '../chains/useChain';
import { useLocalStorage } from '../utils/useLocalStorage';
import { ChainsContext } from '../../context/ChainsContext';
import { useNFCScanner } from '../nfc/useNFCScanner';
import { SwapperContext } from '../../context/SwapperContext';
import { NFCStartResult } from '../../utils/NFCReader';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import {SwapPageUIState} from "../pages/useSwapPage";
import {Chain} from "../../providers/ChainsProvider";
import {WebLNProvider} from "webln";
import {useCheckAdditionalGas} from "./helpers/useCheckAdditionalGas";
import {useSwapState} from "./helpers/useSwapState";

export type FromBtcLnQuotePage = {
  executionSteps?: SingleStep[];
  //Additional gas required to go through with the swap, used for the not enough for gas notice
  additionalGasRequired?: TokenAmount;
  step1init?: {
    //Need to connect a smart chain wallet with the same address as in quote
    invalidSmartChainWallet: boolean;
    //Initiate the swap
    init?: {
      onClick: () => void,
      disabled: boolean,
      loading: boolean
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
      type: "warning" | "error";
      retry: () => void;
    };
    //Either wallet is connected and just these 2 buttons should be displayed
    walletConnected?: {
      lightningWallet: Chain<WebLNProvider>["wallet"];
      //Pay via connected WebLN wallet
      payWithWebLn: {
        loading: boolean;
        onClick: () => void;
      };
      //Switch to showing a QR code and using external lightning wallets
      useExternalWallet: {
        onClick: () => void;
      };
    };
    //Or wallet is disconnected and a QR code should be shown, with 2 buttons and autoClaim switch
    walletDisconnected?: {
      //Displayed in the QR code and in text field
      address: {
        value: string;
        hyperlink: string;
        copy: () => true;
      };
      //Display the modal warning to user to come back after payment is initiated
      addressComeBackWarningModal?: {
        //Close the modal with the user accepting or not
        close: (accepted: boolean) => void;
        //Data for switch about whether to show the dialog again next time
        showAgain: {
          checked: boolean;
          onChange: (checked: boolean) => void;
        };
      };
      //Pay with external lightning wallet by invoking a lightning: deeplink
      payWithLnWallet: {
        onClick: () => void;
      };
      //Connect WebLN wallet and automatically pay after
      payWithWebLn: {
        loading: boolean;
        onClick: () => void;
      };
      //Data for auto claim switch
      autoClaim: {
        value: boolean;
        onChange: (val: boolean) => void;
      };
      //Actively scanning for NFC cards to pay with (NFC icon should be displayed in the QR code)
      nfcScanning: boolean;
    };
    //Payment via NFC is in progress - the other screens are hidden
    nfcPaying?: boolean;
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step3claim?: {
    error?: {
      title: string;
      error: Error;
    };
    expiry?: {
      remaining: number;
      total: number;
    };
    //First button to show for claim, on Solana there is just this button
    commit: {
      text: string;
      loading: boolean;
      disabled: boolean;
      size: 'sm' | 'lg';
      onClick: () => void;
    };
    //Optionally a second button for claim, used for Starknet - only returned if needed
    claim?: {
      text: string;
      loading: boolean;
      disabled: boolean;
      size: 'sm' | 'lg';
      onClick: () => void;
    };
  };
  step4?: {
    state: 'success' | 'failed' | 'expired' | 'expired_uninitialized';
    expiryMessage?: string;
  };
};

export function useFromBtcLnQuote(
  quote: FromBTCLNSwap<any>,
  UICallback: (quote: ISwap, state: SwapPageUIState) => void,
): FromBtcLnQuotePage {
  const { swapper } = useContext(SwapperContext);
  const { connectWallet, disconnectWallet } = useContext(ChainsContext);
  const lightningWallet = useChain('LIGHTNING')?.wallet;
  const smartChainWallet = useSmartChainWallet(quote, true);
  const canClaimInOneShot = quote?.canCommitAndClaimInOneShot();

  const additionalGasRequired = useCheckAdditionalGas(quote);

  const UICallbackRef = useStateRef(UICallback);

  const {
    state,
    totalQuoteTime,
    quoteTimeRemaining,
    isInitiated
  } = useSwapState(quote, (state: FromBTCLNSwapState, initiated: boolean) => {
    if(!initiated) return;
    if(UICallbackRef.current) UICallbackRef.current(quote, "hide");
  });

  const [autoClaim, setAutoClaim] = useLocalStorage('crossLightning-autoClaim', false);
  const [showHyperlinkWarning, setShowHyperlinkWarning] = useLocalStorage(
    'crossLightning-showHyperlinkWarning',
    true
  );
  const [addressWarningModalOpened, setAddressWarningModalOpened] = useState<boolean>(false);

  const [payingWithNFC, setPayingWithNFC] = useState<boolean>(false);
  const NFCScanning = useNFCScanner(
    (address) => {
      //TODO: Maybe we need to stop the scanning here as well
      swapper.Utils.getLNURLTypeAndData(address, false)
        .then((result) => {
          if (result.type !== 'withdraw') return;
          return result;
        })
        .then((lnurlWithdraw) => {
          return (quote as FromBTCLNSwap).settleWithLNURLWithdraw(lnurlWithdraw);
        })
        .then(() => {
          setPayingWithNFC(true);
        })
        .catch((e) => {
          console.error('useFromBtcLnQuote(): Failed to pay invoice via NFC: ', e);
        });
    },
    payingWithNFC || lightningWallet != null
  );

  const abortSignalRef = useAbortSignalRef([quote]);

  const [pay, payLoading, payResult, payError] = useAsync(
    () => lightningWallet.instance.sendPayment(quote.getAddress()),
    [lightningWallet, quote]
  );

  const [callPayFlag, setCallPayFlag] = useState<boolean>(false);
  useEffect(() => {
    if (!callPayFlag) return;
    setCallPayFlag(false);
    if (!lightningWallet) return;
    pay();
  }, [callPayFlag, lightningWallet, pay]);

  const [waitForPayment, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
    return quote
      .waitForPayment(undefined, 2, abortSignalRef.current)
      .then(() => true)
  }, [quote]);

  useEffect(() => {
    if (quote != null && quote.isInitiated() && quote.state === FromBTCLNSwapState.PR_CREATED) {
      waitForPayment();
    }
  }, [quote]);

  const [onCommit, committing, commitSuccess, commitError] = useAsync(
    async (skipChecks?: boolean) => {
      if (canClaimInOneShot) {
        await quote
          .commitAndClaim(smartChainWallet.instance, null, skipChecks)
          .then((txs) => txs[0]);
      } else {
        await quote.commit(smartChainWallet.instance, null, skipChecks);
        if (quote.chainIdentifier === 'STARKNET') await timeoutPromise(5000);
      }
    },
    [quote, smartChainWallet]
  );

  const [onClaim, claiming, claimSuccess, claimError] = useAsync(
    () => quote.claim(smartChainWallet.instance),
    [quote, smartChainWallet]
  );

  useEffect(() => {
    if (state === FromBTCLNSwapState.PR_PAID) {
      if (autoClaim || lightningWallet != null)
        onCommit(true).then(() => {
          if (!canClaimInOneShot) onClaim();
        });
    }
  }, [state]);

  const isQuoteExpired =
    state === FromBTCLNSwapState.QUOTE_EXPIRED ||
    (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !committing && !paymentWaiting);
  const isQuoteExpiredClaim = isQuoteExpired && quote.signatureData != null;

  const isFailed = state === FromBTCLNSwapState.FAILED || state === FromBTCLNSwapState.EXPIRED;

  const isCreated =
    state === FromBTCLNSwapState.PR_CREATED ||
    (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);

  const isClaimCommittable =
    state === FromBTCLNSwapState.PR_PAID ||
    (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && committing) ||
    committing;

  const isClaimClaimable = state === FromBTCLNSwapState.CLAIM_COMMITED && !committing;

  const isClaimable = isClaimCommittable || isClaimClaimable;

  const isSuccess = state === FromBTCLNSwapState.CLAIM_CLAIMED;

  const executionSteps: SingleStep[] = [
    {
      icon: ic_check_outline,
      text: 'Lightning payment received',
      type: 'success',
    },
    {
      icon: ic_swap_horiz,
      text: 'Send claim transaction',
      type: 'disabled',
    },
  ];
  if (isCreated) {
    if (quote.isLNURL()) {
      if (paymentWaiting) {
        executionSteps[0] = {
          icon: ic_hourglass_top_outline,
          text: 'Requesting lightning payment',
          type: 'loading',
        };
      } else {
        executionSteps[0] = {
          icon: ic_flash_on_outline,
          text: 'Request lightning payment',
          type: 'loading',
        };
      }
    } else {
      executionSteps[0] = {
        icon: ic_flash_on_outline,
        text: 'Awaiting lightning payment',
        type: 'loading',
      };
    }
  }
  if (isQuoteExpired && !isQuoteExpiredClaim)
    executionSteps[0] = {
      icon: ic_hourglass_disabled_outline,
      text: 'Quote expired',
      type: 'failed',
    };

  if (canClaimInOneShot) {
    if (isQuoteExpiredClaim) {
      executionSteps[0] = {
        icon: ic_refresh,
        text: 'Lightning payment reverted',
        type: 'failed',
      };
      executionSteps[1] = {
        icon: ic_watch_later_outline,
        text: 'Claim transaction expired',
        type: 'failed',
      };
    }
    if (isClaimable)
      executionSteps[1] = {
        icon: ic_receipt,
        text: committing || claiming ? 'Claiming transaction' : 'Send claim transaction',
        type: 'loading',
      };
    if (isSuccess)
      executionSteps[1] = {
        icon: ic_check_outline,
        text: 'Claim success',
        type: 'success',
      };
    if (isFailed) {
      executionSteps[0] = {
        icon: ic_refresh,
        text: 'Lightning payment reverted',
        type: 'failed',
      };
      executionSteps[1] = {
        icon: ic_watch_later_outline,
        text: 'Swap expired',
        type: 'failed',
      };
    }
  } else {
    executionSteps[1] = {
      icon: ic_swap_horiz,
      text: 'Sending transaction',
      type: 'disabled',
    };
    executionSteps[2] = {
      icon: ic_download_outline,
      text: 'Send claim transaction',
      type: 'disabled',
    };
    if (isQuoteExpiredClaim) {
      executionSteps[0] = {
        icon: ic_refresh,
        text: 'Lightning payment reverted',
        type: 'failed',
      };
      executionSteps[1] = {
        icon: ic_watch_later_outline,
        text: 'Initialization transaction expired',
        type: 'failed',
      };
    }
    if (isClaimCommittable)
      executionSteps[1] = {
        icon: ic_swap_horiz,
        text: committing ? 'Sending initialization transaction' : 'Sending transaction',
        type: 'loading',
      };
    if (isClaimClaimable) {
      executionSteps[1] = {
        icon: ic_check_outline,
        text: 'Initialization success',
        type: 'success',
      };
      executionSteps[2] = {
        icon: ic_receipt,
        text: claiming ? 'Claiming transaction' : 'Send claim transaction',
        type: 'loading',
      };
    }
    if (isSuccess) {
      executionSteps[1] = {
        icon: ic_check_outline,
        text: 'Initialization success',
        type: 'success',
      };
      executionSteps[2] = {
        icon: ic_check_outline,
        text: 'Claim success',
        type: 'success',
      };
    }
    if (isFailed) {
      executionSteps[0] = {
        icon: ic_refresh,
        text: 'Lightning payment reverted',
        type: 'failed',
      };
      executionSteps[1] = {
        icon: ic_check_outline,
        text: 'Initialization success',
        type: 'success',
      };
      executionSteps[2] = {
        icon: ic_watch_later_outline,
        text: 'Swap expired',
        type: 'failed',
      };
    }
  }

  const step1init = useMemo(() => {
    if (!isCreated || isInitiated) return;
    return {
      invalidSmartChainWallet: smartChainWallet === undefined,
      init: !additionalGasRequired ? {
        onClick: () => {
          waitForPayment();
          if (lightningWallet == null) return;
          pay();
        },
        disabled: false,
        loading: false
      } : undefined,
      expiry: {
        remaining: quoteTimeRemaining,
        total: totalQuoteTime,
      },
    };
  }, [
    isCreated,
    paymentWaiting,
    smartChainWallet,
    waitForPayment,
    paymentError,
    quoteTimeRemaining,
    totalQuoteTime,
    additionalGasRequired,
    lightningWallet,
  ]);

  const step2paymentWait = useMemo(() => {
    if (!isCreated || !isInitiated) return;

    let error;
    if(lightningWallet != null && payError != null) error = {
      title: 'Lightning transaction error',
      type: 'error' as const,
      error: payError,
    };
    if(paymentError != null) error = {
      title: 'Connection problem',
      type: 'warning' as const,
      error: paymentError,
      retry: waitForPayment
    }

    return {
      error,
      walletConnected:
        lightningWallet != null && !payingWithNFC && paymentWaiting
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
      walletDisconnected:
        lightningWallet == null && !payingWithNFC && paymentWaiting
          ? {
              autoClaim: {
                value: autoClaim,
                onChange: setAutoClaim,
              },
              address: {
                value: quote.getAddress(),
                hyperlink: quote.getHyperlink(),
                copy: () => {
                  navigator.clipboard.writeText(quote.getAddress());
                  return true;
                }
              },
              addressComeBackWarningModal: addressWarningModalOpened
                ? {
                    close: (accepted: boolean) => {
                      if (accepted) window.location.href = quote.getHyperlink();
                      setAddressWarningModalOpened(false);
                    },
                    showAgain: {
                      checked: showHyperlinkWarning,
                      onChange: setShowHyperlinkWarning,
                    },
                  }
                : undefined,
              payWithLnWallet: {
                onClick: () => {
                  if (!showHyperlinkWarning) {
                    window.location.href = quote.getHyperlink();
                    return;
                  }
                  //Show dialog and then pay
                  setAddressWarningModalOpened(true);
                },
              },
              payWithWebLn: {
                onClick: () => {
                  connectWallet('LIGHTNING').then((success) => {
                    //Call pay on next state update
                    if (success) setCallPayFlag(true);
                  });
                },
                loading: payLoading,
              },
              nfcScanning: NFCScanning === NFCStartResult.OK,
            }
          : undefined,
      nfcPaying: payingWithNFC,
      expiry: {
        remaining: quoteTimeRemaining,
        total: totalQuoteTime,
      },
    };
  }, [
    isCreated,
    paymentWaiting,
    autoClaim,
    quote,
    quoteTimeRemaining,
    totalQuoteTime,
    addressWarningModalOpened,
    showHyperlinkWarning,
    lightningWallet,
    paymentError,
    waitForPayment,
    pay,
    payLoading,
    payError,
    NFCScanning,
    payingWithNFC,
  ]);

  const step3claim = useMemo(() => {
    if (!isClaimable) return;
    return {
      error:
        commitError || claimError
          ? {
              title:
                canClaimInOneShot || claimError != null
                  ? 'Swap claim error'
                  : 'Swap claim initialization error',
              error: commitError ?? claimError,
            }
          : undefined,
      expiry:
        state === FromBTCLNSwapState.PR_PAID && !claiming && !committing
          ? {
              remaining: quoteTimeRemaining,
              total: totalQuoteTime,
            }
          : undefined,
      commit: canClaimInOneShot
        ? {
            text: 'Finish swap (claim funds)',
            loading: committing,
            disabled: committing,
            size: 'lg' as const,
            onClick: () => onCommit(),
          }
        : {
            text: !isClaimCommittable
              ? '1. Initialized'
              : committing
                ? '1. Initializing...'
                : '1. Finish swap (initialize)',
            loading: committing,
            disabled: committing || !isClaimCommittable,
            size: isClaimCommittable ? ('lg' as const) : ('sm' as const),
            onClick: () => onCommit(),
          },
      claim: !canClaimInOneShot
        ? {
            text: claiming ? '2. Claiming funds...' : '2. Finish swap (claim funds)',
            loading: claiming,
            disabled: claiming || !isClaimClaimable,
            size: isClaimClaimable ? ('lg' as const) : ('sm' as const),
            onClick: onClaim,
          }
        : undefined,
    };
  }, [
    isClaimable,
    commitError,
    claimError,
    canClaimInOneShot,
    state,
    claiming,
    committing,
    quoteTimeRemaining,
    totalQuoteTime,
    onCommit,
    isClaimCommittable,
    isClaimClaimable,
    onClaim,
  ]);

  const step4 = useMemo(() => {
    if (!isSuccess && !isFailed && !isQuoteExpired) return;
    return {
      state: isSuccess
        ? ('success' as const)
        : isFailed
          ? ('failed' as const)
          : isInitiated
            ? ('expired' as const)
            : ('expired_uninitialized' as const),
      expiryMessage: 'Swap expired! Your lightning payment should refund shortly.',
    };
  }, [isSuccess, isFailed, isQuoteExpired, isInitiated]);

  return {
    additionalGasRequired: !isInitiated || isQuoteExpired ? additionalGasRequired : undefined,
    executionSteps: isInitiated ? executionSteps : undefined,
    step1init,
    step2paymentWait,
    step3claim,
    step4,
  };
}
