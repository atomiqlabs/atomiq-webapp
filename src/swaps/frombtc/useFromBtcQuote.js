import { FromBTCSwapState } from "@atomiqlabs/sdk";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ChainDataContext } from "../../wallets/context/ChainDataContext";
import { useChain } from "../../wallets/hooks/useChain";
import { useSmartChainWallet } from "../../wallets/hooks/useSmartChainWallet";
import { useSwapState } from "../hooks/useSwapState";
import { useAsync } from "../../utils/hooks/useAsync";
import { useStateRef } from "../../utils/hooks/useStateRef";
import { useAbortSignalRef } from "../../utils/hooks/useAbortSignal";
import { ic_gavel_outline } from 'react-icons-kit/md/ic_gavel_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useLocalStorage } from "../../utils/hooks/useLocalStorage";
import { useCheckAdditionalGas } from "../useCheckAdditionalGas";
import { getDeltaText } from "../../utils/Utils";
export function useFromBtcQuote(quote, setAmountLock, feeRate, inputWalletBalance) {
    const { disconnectWallet, connectWallet } = useContext(ChainDataContext);
    const bitcoinChainData = useChain('BITCOIN');
    const bitcoinWallet = bitcoinChainData.wallet;
    const smartChainWallet = useSmartChainWallet(quote, true);
    const additionalGasRequired = useCheckAdditionalGas(quote);
    const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(quote);
    const [copyWarningModalOpened, setCopyWarningModalOpened] = useState(false);
    const [showCopyWarning, setShowCopyWarning] = useLocalStorage('crossLightning-copywarning', true);
    const [payBitcoin, payLoading, payTxId, payError] = useAsync(() => quote.sendBitcoinTransaction(bitcoinChainData.wallet.instance, feeRate === 0 ? null : feeRate), [bitcoinChainData.wallet, feeRate, quote]);
    const [callPayFlag, setCallPayFlag] = useState(false);
    useEffect(() => {
        if (!callPayFlag)
            return;
        setCallPayFlag(false);
        if (!bitcoinChainData.wallet)
            return;
        payBitcoin();
    }, [callPayFlag, bitcoinChainData.wallet, payBitcoin]);
    const isAlreadyClaimable = useMemo(() => (quote != null ? quote.isClaimable() : false), [quote]);
    const setAmountLockRef = useStateRef(setAmountLock);
    const [onCommit, commitLoading, commitSuccess, commitError] = useAsync(async () => {
        if (setAmountLockRef.current != null)
            setAmountLockRef.current(true);
        const commitTxId = await quote.commit(smartChainWallet.instance).catch((e) => {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
            throw e;
        });
        if (bitcoinChainData.wallet != null)
            payBitcoin();
        return commitTxId;
    }, [quote, smartChainWallet, payBitcoin]);
    const abortSignalRef = useAbortSignalRef([quote]);
    const [onWaitForPayment, waitingPayment, waitPaymentSuccess, waitPaymentError] = useAsync(() => quote.waitForBitcoinTransaction(abortSignalRef.current, null, (txId, confirmations, confirmationTarget, txEtaMs) => {
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
    }), [quote]);
    const [onClaim, claimLoading, claimSuccess, claimError] = useAsync(() => {
        return quote.claim(smartChainWallet.instance);
    }, [quote, smartChainWallet]);
    const textFieldRef = useRef();
    const openModalRef = useRef(null);
    const [txData, setTxData] = useState(null);
    const [claimable, setClaimable] = useState(false);
    useEffect(() => {
        if (state === FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) {
            onWaitForPayment();
        }
        let timer = null;
        if (state === FromBTCSwapState.BTC_TX_CONFIRMED) {
            timer = setTimeout(() => {
                setClaimable(true);
            }, 20 * 1000);
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
    const isQuoteExpired = state === FromBTCSwapState.QUOTE_EXPIRED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && !commitLoading);
    const isCreated = state === FromBTCSwapState.PR_CREATED ||
        (state === FromBTCSwapState.QUOTE_SOFT_EXPIRED && commitLoading);
    const isCommited = state === FromBTCSwapState.CLAIM_COMMITED && txData == null;
    const isReceived = state === (FromBTCSwapState.CLAIM_COMMITED || state === FromBTCSwapState.EXPIRED) &&
        txData != null;
    const isClaimable = state === FromBTCSwapState.BTC_TX_CONFIRMED && !claimLoading;
    const isClaiming = state === FromBTCSwapState.BTC_TX_CONFIRMED && claimLoading;
    const isExpired = state === FromBTCSwapState.EXPIRED && txData == null;
    const isFailed = state === FromBTCSwapState.FAILED;
    const isSuccess = state === FromBTCSwapState.CLAIM_CLAIMED;
    useEffect(() => {
        if (isSuccess ||
            isFailed ||
            isExpired ||
            isQuoteExpired) {
            if (setAmountLockRef.current != null)
                setAmountLockRef.current(false);
        }
    }, [isSuccess, isFailed, isExpired, isQuoteExpired]);
    /*
      Steps:
      1. Opening swap address -> Swap address opened
      2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
      3. Claim transaction -> Sending claim transaction -> Claim success
       */
    const executionSteps = [
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
    if (isCreated) {
        if (commitError) {
            executionSteps[0] = {
                icon: ic_warning,
                text: 'Transaction didn’t confirm',
                type: 'failed',
            };
        }
        else if (commitLoading) {
            executionSteps[0] = {
                icon: ic_hourglass_empty_outline,
                text: 'Opening swap address',
                type: 'loading',
            };
        }
        else {
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
    if (isCommited)
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
        if (claimable || isAlreadyClaimable) {
            executionSteps[2] = {
                icon: ic_receipt,
                text: 'Claim transaction',
                type: 'loading',
            };
        }
        else {
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
        invalidSmartChainWallet: smartChainWallet == null,
        init: smartChainWallet != null ? {
            onClick: onCommit,
            disabled: commitLoading || !hasEnoughBalance || !!additionalGasRequired,
            loading: commitLoading
        } : undefined,
        error: commitError ? {
            title: "Swap initialization error",
            error: commitError
        } : undefined,
        additionalGasRequired: additionalGasRequired,
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
    const step2paymentWait = useMemo(() => (!isCommited || (bitcoinWallet && payTxId) ? undefined : {
        error: waitPaymentError || (payError && bitcoinWallet) ? {
            title: payError && bitcoinWallet ? "Bitcoin transaction error" : "Wait payment error",
            error: payError && bitcoinWallet ? payError : waitPaymentError,
            retry: payError ? undefined : onWaitForPayment
        } : undefined,
        //Either wallet is connected and just these 2 buttons should be displayed
        walletConnected: bitcoinWallet != null ? {
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
                    disconnectWallet('BITCOIN');
                },
            },
        } : undefined,
        //Or wallet is disconnected and a QR code should be shown, with 2 buttons and autoClaim switch
        walletDisconnected: bitcoinWallet == null ? {
            //Displayed in the QR code and in text field
            address: {
                value: quote.getAddress(),
                hyperlink: quote.getHyperlink(),
                copy: () => {
                    if (!showCopyWarning) {
                        navigator.clipboard.writeText(quote.getAddress());
                        return;
                    }
                    setCopyWarningModalOpened(true);
                }
            },
            //Display the modal warning to user to come back after payment is initiated
            addressCopyWarningModal: copyWarningModalOpened ? {
                btcAmount: quote.getInput(),
                //Close the modal with the user accepting or not (will only copy the address if user accepted!)
                close: (accepted) => {
                    if (accepted)
                        navigator.clipboard.writeText(quote.getAddress());
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
                        if (success)
                            setCallPayFlag(true);
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
        payTxId,
        waitPaymentError,
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
    const step3awaitingConfirmations = useMemo(() => (!isReceived && !(bitcoinWallet && payTxId) ? undefined : {
        broadcasting: payTxId != null && txData == null,
        txData: txData != null ? {
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
        } : undefined,
        error: waitPaymentError ? {
            title: "Wait payment error",
            error: waitPaymentError,
            retry: onWaitForPayment
        } : undefined
    }), [
        isReceived,
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
    const step5 = useMemo(() => (!isSuccess && !isFailed && !isQuoteExpired && !isExpired ? undefined : {
        state: isSuccess
            ? "success"
            : (isFailed || isExpired)
                ? "failed"
                : "expired",
    }), [
        isSuccess,
        isFailed,
        isQuoteExpired
    ]);
    return {
        executionSteps: isInitiated ? executionSteps : undefined,
        step1init,
        step2paymentWait,
        step3awaitingConfirmations,
        step4claim,
        step5
    };
}
