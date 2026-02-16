import {FromBTCLNAutoSwap, FromBTCLNSwap, FromBTCLNSwapState, ISwap, SwapType, TokenAmount} from '@atomiqlabs/sdk';
import {useContext, useEffect, useMemo, useState} from 'react';
import {useStateRef} from '../utils/useStateRef';
import {useAbortSignalRef} from '../utils/useAbortSignal';
import {useAsync} from '../utils/useAsync';
import {SingleStep} from '../../components/swaps/StepByStep';
import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_swap_horiz} from 'react-icons-kit/md/ic_swap_horiz';
import {ic_check_outline} from 'react-icons-kit/md/ic_check_outline';
import {timeoutPromise} from '../../utils/Utils';
import {useSmartChainWallet} from '../wallets/useSmartChainWallet';
import {useChain} from '../chains/useChain';
import {useLocalStorage} from '../utils/useLocalStorage';
import {ChainsContext} from '../../context/ChainsContext';
import {useNFCScanner} from '../nfc/useNFCScanner';
import {SwapperContext} from '../../context/SwapperContext';
import {NFCStartResult} from '../../utils/NFCReader';
import {ic_receipt} from 'react-icons-kit/md/ic_receipt';
import {SwapPageUIState} from "../pages/useSwapPage";
import {Chain, WalletTypes} from "../../providers/ChainsProvider";
import {WebLNProvider} from "webln";
import {useCheckAdditionalGas} from "./helpers/useCheckAdditionalGas";
import {useSwapState} from "./helpers/useSwapState";
import {useWallet} from "../wallets/useWallet";

export type FromBtcLnQuotePage = {
  executionSteps?: SingleStep[];
  //Additional gas required to go through with the swap, used for the not enough for gas notice
  additionalGasRequired?: TokenAmount;
  step1init?: {
    //Need to connect any smart chain wallet at all
    requiresSmartChainWallet: boolean;
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
        copy: () => boolean;
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
        buttonText: string;
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
      autoClaim?: {
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
    waitingForLPInit?: boolean,
    waitingForWatchtowerClaim?: boolean,
    error?: {
      title: string;
      error: Error;
      type: "warning" | "error";
      retry?: () => void;
    };
    expiry?: {
      remaining: number;
      total: number;
    };
    //First button to show for claim, on Solana there is just this button
    commit?: {
      text: string;
      loading: boolean;
      disabled: boolean;
      size: 'sm' | 'lg';
      onClick: () => void;
      requiredConnectedWalletAddress?: string;
    };
    //Optionally a second button for claim, used for Starknet - only returned if needed
    claim?: {
      text: string;
      loading: boolean;
      disabled: boolean;
      size: 'sm' | 'lg';
      onClick: () => void;
      requiredConnectedWalletAddress?: string;
    };
  };
  step4?: {
    state: 'success' | 'failed' | 'expired' | 'expired_uninitialized';
    expiryMessage?: string;
    showConnectWalletButton: boolean;
  };
};

export function useFromBtcLnQuote(
  quote: FromBTCLNSwap<any> | FromBTCLNAutoSwap<any>,
  UICallback: (quote: ISwap, state: SwapPageUIState) => void,
): FromBtcLnQuotePage {
  const { swapper } = useContext(SwapperContext);
  const { connectWallet, disconnectWallet } = useContext(ChainsContext);

  const _lightningWallet = useWallet('LIGHTNING', true);
  const lightningWallet: Chain<WebLNProvider>["wallet"] | null = _lightningWallet?.instance?._lnurl!=null
    ? null
    : _lightningWallet;

  const smartChainWallet = useSmartChainWallet(quote, true, false);
  const canClaimInOneShot = useMemo(() => {
    if(quote==null) return;
    if(quote.getType() !== SwapType.FROM_BTCLN) return;
    if(quote.chainIdentifier === 'SOLANA' && smartChainWallet?.name === 'MetaMask') return false;
    return (quote as FromBTCLNSwap).canCommitAndClaimInOneShot();
  }, [quote, smartChainWallet]);

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
  const [addressWarningModalOpened, setAddressWarningModalOpened] = useState<"link" | "copy">(null);

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
    if (quote != null && quote.isInitiated() && quote.getState() === FromBTCLNSwapState.PR_CREATED) {
      waitForPayment();
    }
  }, [quote]);

  const [onCommit, committing, commitSuccess, commitError] = useAsync(
    async (skipChecks?: boolean) => {
      if (quote.getType() === SwapType.FROM_BTCLN_AUTO) return;
      const _quote = quote as FromBTCLNSwap;
      if (canClaimInOneShot) {
        await _quote
          .commitAndClaim(smartChainWallet.instance, null, skipChecks)
          .then((txs) => txs[0]);
      } else {
        await _quote.commit(smartChainWallet.instance, null, skipChecks);
        if (_quote.chainIdentifier === 'STARKNET') await timeoutPromise(5000);
      }
      return true;
    },
    [quote, smartChainWallet, canClaimInOneShot]
  );

  const [onClaim, claiming, claimSuccess, claimError] = useAsync(
    () => quote.claim(smartChainWallet.instance),
    [quote, smartChainWallet]
  );

  useEffect(() => {
    if (quote?.getType() === SwapType.FROM_BTCLN_AUTO) return;
    if (state === FromBTCLNSwapState.PR_PAID) {
      if (autoClaim || lightningWallet != null)
        onCommit(true).then((success) => {
          if (success && !canClaimInOneShot) onClaim();
        });
    }
  }, [state]);

  const isQuoteExpired =
    state === FromBTCLNSwapState.QUOTE_EXPIRED ||
    (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !committing && !paymentWaiting);
  const isQuoteExpiredAfterPayment = isQuoteExpired && quote._data != null;

  const isFailed = state === FromBTCLNSwapState.FAILED || state === FromBTCLNSwapState.EXPIRED;

  const isCreated =
    state === FromBTCLNSwapState.PR_CREATED ||
    (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);

  const isClaimCommittable =
    state === FromBTCLNSwapState.PR_PAID ||
    committing;

  const isAwaitingLpInit = state === FromBTCLNSwapState.PR_PAID &&
    quote?.getType() === SwapType.FROM_BTCLN_AUTO;

  const isCommited = state === FromBTCLNSwapState.CLAIM_COMMITED;
  const isClaimClaimable = isCommited && !committing;

  const isClaimable = isClaimCommittable || isClaimClaimable;

  const _isAlreadyClaimable = useMemo(
    () => quote?.getType() === SwapType.FROM_BTCLN || quote?.isClaimable(),
    [quote]
  );
  const [waitForSettlement, settlementWaiting, settlementSuccess, settlementError] = useAsync(() => {
    return quote.waitTillClaimed(60, abortSignalRef.current);
  }, [quote]);
  useEffect(() => {
    if(!_isAlreadyClaimable && isCommited && quote?.getType()===SwapType.FROM_BTCLN_AUTO) {
      waitForSettlement();
    }
  }, [_isAlreadyClaimable, isCommited, quote]);
  const isWaitingForWatchtowerClaim =
    !_isAlreadyClaimable && isClaimClaimable && quote?.getType() === SwapType.FROM_BTCLN_AUTO && settlementSuccess==null;

  const isSuccess = state === FromBTCLNSwapState.CLAIM_CLAIMED;

  const executionSteps: SingleStep[] = [
    {
      icon: ic_check_outline,
      text: 'Lightning payment received',
      type: 'success',
    },
    {
      icon: ic_swap_horiz,
      text: quote?.getType() === SwapType.FROM_BTCLN_AUTO
        ? 'Automatic settlement'
        : 'Manual swap settlement',
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

  if (isQuoteExpired) {
    if(isQuoteExpiredAfterPayment) {
      executionSteps[0] = {
        icon: ic_refresh,
        text: 'Lightning payment reverted',
        type: 'failed',
      };
      executionSteps[1] = {
        icon: ic_watch_later_outline,
        text: 'Settlement transaction expired',
        type: 'failed',
      };
    } else {
      executionSteps[0] = {
        icon: ic_hourglass_disabled_outline,
        text: 'Swap expired',
        type: 'failed',
      };
    }
  }

  if (isClaimable) {
    if(isAwaitingLpInit) {
      executionSteps[1] = {
        icon: ic_hourglass_top_outline,
        text: 'Waiting for LP',
        type: 'loading',
      };
    } else if(isWaitingForWatchtowerClaim) {
      executionSteps[1] = {
        icon: ic_receipt,
        text: 'Waiting automatic settlement',
        type: 'loading',
      };
    } else {
      executionSteps[1] = {
        icon: ic_receipt,
        text: committing || claiming ? 'Sending settlement transaction' : 'Manual settlement',
        type: 'loading',
      };
    }
  }
  if (isSuccess)
    executionSteps[1] = {
      icon: ic_check_outline,
      text: 'Swap settled',
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

  const step1init = useMemo(() => {
    if (!isCreated || isInitiated) return;
    return {
      requiresSmartChainWallet: quote?.getType()===SwapType.FROM_BTCLN,
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
    isInitiated,
    paymentWaiting,
    smartChainWallet,
    waitForPayment,
    paymentError,
    quoteTimeRemaining,
    totalQuoteTime,
    additionalGasRequired,
    lightningWallet,
    quote
  ]);

  const step2paymentWait = useMemo(() => {
    if (!isCreated || !isInitiated) return;

    let error;
    if(lightningWallet != null && payError != null) error = {
      title: 'Failed to send Lightning transaction',
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
        !quote.isLNURL() && lightningWallet != null && !payingWithNFC && paymentWaiting
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
        !quote.isLNURL() && lightningWallet == null && !payingWithNFC && paymentWaiting
          ? {
              autoClaim: quote?.getType()===SwapType.FROM_BTCLN_AUTO
                ? undefined
                : {
                  value: autoClaim,
                  onChange: setAutoClaim,
                },
              address: {
                value: quote.getAddress(),
                hyperlink: quote.getHyperlink(),
                copy: () => {
                  if (!showHyperlinkWarning) {
                    navigator.clipboard.writeText(quote.getAddress());
                    return true;
                  }
                  setAddressWarningModalOpened("copy");
                  return false;
                }
              },
              addressComeBackWarningModal: addressWarningModalOpened
                ? {
                    close: (accepted: boolean) => {
                      if (accepted) {
                        if (addressWarningModalOpened === "copy") {
                          navigator.clipboard.writeText(quote.getAddress());
                        } else {
                          window.location.href = quote.getHyperlink();
                        }
                      }
                      setAddressWarningModalOpened(null);
                    },
                    showAgain: {
                      checked: showHyperlinkWarning,
                      onChange: setShowHyperlinkWarning,
                    },
                    buttonText: addressWarningModalOpened === "copy"
                      ? 'Understood, copy to clipboard'
                      : 'Understood, pay with LN wallet'
                  }
                : undefined,
              payWithLnWallet: {
                onClick: () => {
                  if (!showHyperlinkWarning) {
                    window.location.href = quote.getHyperlink();
                    return;
                  }
                  //Show dialog and then pay
                  setAddressWarningModalOpened("link");
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
    isInitiated,
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

    if(quote?.getType() === SwapType.FROM_BTCLN_AUTO) {
      return {
        waitingForLPInit: isAwaitingLpInit,
        waitingForWatchtowerClaim: isWaitingForWatchtowerClaim,
        error:
          claimError
            ? {
              title: 'Failed to manually settle',
              error: claimError,
              type: 'error' as const
            }
            : settlementError
              ? {
                title: 'Connection problem',
                error: settlementError,
                type: 'warning' as const,
                retry: waitForSettlement,
              }
              : undefined,
        expiry:
          state === FromBTCLNSwapState.CLAIM_COMMITED && !claiming && !isWaitingForWatchtowerClaim
            ? {
              remaining: quoteTimeRemaining,
              total: totalQuoteTime,
            }
            : undefined,
        claim: isClaimClaimable && !isWaitingForWatchtowerClaim
          ? {
            text: 'Settle swap',
            loading: claiming,
            disabled: claiming,
            size: 'lg' as const,
            onClick: onClaim,
          }
          : undefined
      }
    }

    return {
      error:
        commitError || claimError
          ? {
              title:
                canClaimInOneShot || claimError != null
                  ? 'Failed to settle'
                  : 'Failed to initiate settlement',
              error: commitError ?? claimError,
              type: 'error' as const
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
            text: 'Settle swap',
            loading: committing,
            disabled: committing,
            size: 'lg' as const,
            onClick: onCommit,
            requiredConnectedWalletAddress: quote?.getType() === SwapType.FROM_BTCLN
              ? quote._getInitiator()
              : undefined
          }
        : {
            text: !isClaimCommittable
              ? '1. Initialized'
              : '1. Initialize settlement',
            loading: committing,
            disabled: committing || !isClaimCommittable,
            size: isClaimCommittable ? ('lg' as const) : ('sm' as const),
            onClick: onCommit,
            requiredConnectedWalletAddress: quote?.getType() === SwapType.FROM_BTCLN
              ? quote._getInitiator()
              : undefined
          },
      claim: !canClaimInOneShot
        ? {
            text: '2. Settle swap',
            loading: claiming,
            disabled: claiming || !isClaimClaimable,
            size: isClaimClaimable ? ('lg' as const) : ('sm' as const),
            onClick: onClaim,
            requiredConnectedWalletAddress: quote?.getType() === SwapType.FROM_BTCLN
              ? quote._getInitiator()
              : undefined
          }
        : undefined,
    };
  }, [
    quote,
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
    isAwaitingLpInit,
    isWaitingForWatchtowerClaim,
    settlementError
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
      expiryMessage: isQuoteExpiredAfterPayment
        ? 'Failed to settle the swap before expiration. Your lightning payment will now be refunded!'
        : 'Swap has expired. If you\'ve already sent the lightning payment, it will be refunded!',
      showConnectWalletButton: isQuoteExpired && !isInitiated
        && smartChainWallet===undefined && quote?.getType()===SwapType.FROM_BTCLN
    };
  }, [isSuccess, isFailed, isQuoteExpired, isInitiated, isQuoteExpiredAfterPayment, smartChainWallet, quote]);

  return {
    additionalGasRequired: !isInitiated || isQuoteExpired ? additionalGasRequired : undefined,
    executionSteps: isInitiated ? executionSteps : undefined,
    step1init,
    step2paymentWait,
    step3claim,
    step4,
  };
}
