import {FromBTCLNSwap, FromBTCLNSwapState, TokenAmount} from '@atomiqlabs/sdk';
import {useContext, useEffect, useMemo, useState} from 'react';
import {useSwapState} from '../hooks/useSwapState';
import {useStateRef} from '../../utils/hooks/useStateRef';
import {useAbortSignalRef} from '../../utils/hooks/useAbortSignal';
import {useAsync} from '../../utils/hooks/useAsync';
import {SingleStep} from '../../components/StepByStep';

import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {ic_swap_horiz} from 'react-icons-kit/md/ic_swap_horiz';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {ic_download_outline} from 'react-icons-kit/md/ic_download_outline';
import {timeoutPromise} from '../../utils/Utils';
import {useSmartChainWallet} from '../../wallets/hooks/useSmartChainWallet';
import {useChain} from '../../wallets/hooks/useChain';
import {useLocalStorage} from '../../utils/hooks/useLocalStorage';
import {useCheckAdditionalGas} from '../useCheckAdditionalGas';
import {ChainDataContext} from '../../wallets/context/ChainDataContext';
import {useNFCScanner} from "../../nfc/hooks/useNFCScanner";
import {SwapsContext} from "../context/SwapsContext";
import {NFCStartResult} from "../../nfc/NFCReader";

export type FromBtcLnQuotePage = {
  executionSteps?: SingleStep[];
  step1init?: {
    //Need to connect a smart chain wallet with the same address as in quote
    invalidSmartChainWallet: boolean;
    //Initiate the swap
    init: () => void;
    error?: {
      title: string;
      error: Error;
    };
    //Additional gas required to go through with the swap, used for the not enough for gas notice
    additionalGasRequired?: TokenAmount;
    expiry: {
      remaining: number;
      total: number;
    };
  };
  step2paymentWait?: {
    error?: {
      title: string;
      error: Error;
    };
    //Either wallet is connected and just these 2 buttons should be displayed
    walletConnected?: {
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
    state: 'success' | 'failed' | 'expired';
    expiryMessage?: string;
  };
};

export function useFromBtcLnQuote2(
  quote: FromBTCLNSwap<any>,
  setAmountLock: (isLocked: boolean) => void
): FromBtcLnQuotePage {
  const { swapper } = useContext(SwapsContext);
  const { connectWallet, disconnectWallet } = useContext(ChainDataContext);
  const lightningWallet = useChain('LIGHTNING')?.wallet;
  const smartChainWallet = useSmartChainWallet(quote, true);
  const canClaimInOneShot = quote?.canCommitAndClaimInOneShot();

  const additionalGasRequired = useCheckAdditionalGas(quote);

  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote);
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
        }).catch(e => {
          console.error("useFromBtcLnQuote(): Failed to pay invoice via NFC: ", e);
        });
    },
    payingWithNFC || lightningWallet!=null
  );

  const setAmountLockRef = useStateRef(setAmountLock);
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
    if (setAmountLockRef.current != null) setAmountLockRef.current(true);
    return quote
      .waitForPayment(abortSignalRef.current, 2)
      .then(() => true)
      .catch((err) => {
        if (setAmountLockRef.current != null) setAmountLockRef.current(false);
        throw err;
      });
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

  useEffect(() => {
    if (isQuoteExpired || isFailed || isSuccess) {
      if (setAmountLockRef.current != null) setAmountLockRef.current(false);
    } else if (!isCreated) {
      if (setAmountLockRef.current != null) setAmountLockRef.current(true);
    }
  }, [isQuoteExpired, isFailed, isSuccess, isCreated]);

  const executionSteps: SingleStep[] = [
    {
      icon: ic_check_circle_outline,
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
        icon: ic_swap_horiz,
        text: committing || claiming ? 'Sending claim transaction' : 'Send claim transaction',
        type: 'loading',
      };
    if (isSuccess)
      executionSteps[1] = {
        icon: ic_verified_outline,
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
        icon: ic_check_circle_outline,
        text: 'Initialization success',
        type: 'success',
      };
      executionSteps[2] = {
        icon: ic_download_outline,
        text: claiming ? 'Sending claim transaction' : 'Send claim transaction',
        type: 'loading',
      };
    }
    if (isSuccess) {
      executionSteps[1] = {
        icon: ic_check_circle_outline,
        text: 'Initialization success',
        type: 'success',
      };
      executionSteps[2] = {
        icon: ic_verified_outline,
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
        icon: ic_check_circle_outline,
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
    if (!isCreated || paymentWaiting) return;
    return {
      invalidSmartChainWallet: smartChainWallet === undefined,
      init: () => {
        waitForPayment();
        if (lightningWallet == null) return;
        pay();
      },
      error:
        paymentError != null
          ? {
              title: 'Swap initialization error',
              error: paymentError,
            }
          : undefined,
      additionalGasRequired,
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
    if (!isCreated || !paymentWaiting) return;
    return {
      error:
        lightningWallet != null && payError != null
          ? {
              title: 'Sending BTC error',
              error: payError,
            }
          : undefined,
      walletConnected:
        lightningWallet != null && !payingWithNFC
          ? {
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
        lightningWallet == null && !payingWithNFC
          ? {
              autoClaim: {
                value: autoClaim,
                onChange: setAutoClaim,
              },
              address: {
                value: quote.getAddress(),
                hyperlink: quote.getHyperlink(),
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
              nfcScanning: NFCScanning===NFCStartResult.OK,
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
    pay,
    payLoading,
    payError,
    NFCScanning,
    payingWithNFC
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
          : ('expired' as const),
      expiryMessage: isInitiated
        ? 'Swap expired! Your lightning payment should refund shortly.'
        : 'Swap expired!',
    };
  }, [isSuccess, isFailed, isQuoteExpired, isInitiated]);

  return {
    executionSteps,
    step1init,
    step2paymentWait,
    step3claim,
    step4,
  };
}
