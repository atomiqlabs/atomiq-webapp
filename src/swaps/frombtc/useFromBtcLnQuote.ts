import {FromBTCLNAutoSwap, FromBTCLNSwap, FromBTCLNSwapState, ISwap, SwapType} from "@atomiqlabs/sdk";
import {useEffect, useMemo, useState} from "react";
import {useSwapState} from "../hooks/useSwapState";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {useAbortSignalRef} from "../../utils/hooks/useAbortSignal";
import {useAsync} from "../../utils/hooks/useAsync";
import {SingleStep} from "../../components/StepByStep";

import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {ic_download_outline} from 'react-icons-kit/md/ic_download_outline';
import {timeoutPromise} from "../../utils/Utils";
import {useSmartChainWallet} from "../../wallets/hooks/useSmartChainWallet";

export function useFromBtcLnQuote(
    quote: FromBTCLNSwap<any> | FromBTCLNAutoSwap<any>,
    setAmountLock: (isLocked: boolean) => void,
) {
    const smartChainWallet = useSmartChainWallet(quote, true);
    const canClaimInOneShot = quote?.getType()===SwapType.FROM_BTCLN_AUTO || (quote as FromBTCLNSwap)?.canCommitAndClaimInOneShot();

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(quote as ISwap);

    const setAmountLockRef = useStateRef(setAmountLock);
    const abortSignalRef = useAbortSignalRef([quote]);

    const [waitForPayment, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        return quote.waitForPayment(undefined, 2, abortSignalRef.current).then(() => true).catch(err => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw err;
        });
    }, [quote]);

    const [onCommit, committing, commitSuccess, commitError] = useAsync(
        async (skipChecks?: boolean) => {
            if(quote.getType()===SwapType.FROM_BTCLN_AUTO) return;
            const _quote = quote as FromBTCLNSwap;
            if(canClaimInOneShot) {
                await _quote.commitAndClaim(smartChainWallet.instance, null, skipChecks).then(txs => txs[0]);
            } else {
                await _quote.commit(smartChainWallet.instance, null, skipChecks);
                if(quote.chainIdentifier==="STARKNET") await timeoutPromise(5000);
            }
        },
        [quote, smartChainWallet]
    );

    const [onClaim, claiming, claimSuccess, claimError] = useAsync(
        () => quote.claim(smartChainWallet.instance),
        [quote, smartChainWallet]
    );

    const isQuoteExpired = state === FromBTCLNSwapState.QUOTE_EXPIRED ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !committing && !paymentWaiting);

    const isQuoteExpiredClaim = isQuoteExpired && quote.commitTxId!=null;

    const isFailed = state===FromBTCLNSwapState.FAILED ||
        state===FromBTCLNSwapState.EXPIRED;

    const isCreated = state===FromBTCLNSwapState.PR_CREATED ||
        (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);

    const isLpAutoCommiting = state===FromBTCLNSwapState.PR_PAID && quote?.getType()===SwapType.FROM_BTCLN_AUTO;

    const isClaimCommittable = (state===FromBTCLNSwapState.PR_PAID && quote?.getType()!==SwapType.FROM_BTCLN_AUTO) || committing;

    const isClaimClaimable = state===FromBTCLNSwapState.CLAIM_COMMITED && !committing;

    const isClaimable = isClaimCommittable || isClaimClaimable;

    const isSuccess = state===FromBTCLNSwapState.CLAIM_CLAIMED;

    const isAlreadyClaimable = useMemo(() => quote?.isClaimable(), [quote]);
    const [isWaitingForWatchtowerClaim, setWaitingForWatchtowerClaim] = useState<boolean>(true);
    useEffect(() => {
        if(isClaimable && quote?.getType()===SwapType.FROM_BTCLN_AUTO) {
            const timeout = setTimeout(() => {
                setWaitingForWatchtowerClaim(false);
            }, 60*1000);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [isClaimClaimable, quote]);

    useEffect(() => {
        if(isQuoteExpired || isFailed || isSuccess) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        } else if(!isCreated) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        }
    }, [isQuoteExpired, isFailed, isSuccess, isCreated]);

    const executionSteps: SingleStep[] = [
        {icon: ic_check_circle_outline, text: "Lightning payment received", type: "success"},
        {icon: ic_swap_horizontal_circle_outline, text: "Send claim transaction", type: "disabled"}
    ];
    if(isCreated) {
        if(quote.isLNURL()) {
            if(paymentWaiting)  {
                executionSteps[0] = {icon: ic_hourglass_top_outline, text: "Requesting lightning payment", type: "loading"};
            } else {
                executionSteps[0] = {icon: ic_flash_on_outline, text: "Request lightning payment", type: "loading"};
            }
        } else {
            executionSteps[0] = {icon: ic_flash_on_outline, text: "Awaiting lightning payment", type: "loading"};
        }
    }
    if(isQuoteExpired && !isQuoteExpiredClaim) executionSteps[0] = {icon: ic_hourglass_disabled_outline, text: "Quote expired", type: "failed"};

    if(canClaimInOneShot || quote?.getType()===SwapType.FROM_BTCLN_AUTO) {
        if(isQuoteExpiredClaim) {
            executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
            executionSteps[1] = {icon: ic_watch_later_outline, text: "Claim transaction expired", type: "failed"};
        }
        if(isLpAutoCommiting) executionSteps[1] = {icon: ic_hourglass_top_outline, text: "Waiting for LP", type: "loading"};
        if(isClaimable) executionSteps[1] = {icon: ic_swap_horizontal_circle_outline, text: (committing || claiming) ? "Sending claim transaction" : "Send claim transaction", type: "loading"};
        if(isSuccess) executionSteps[1] = {icon: ic_verified_outline, text: "Claim success", type: "success"};
        if(isFailed) {
            executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
            executionSteps[1] = {icon: ic_watch_later_outline, text: "Swap expired", type: "failed"};
        }
    } else {
        executionSteps[1] = {icon: ic_swap_horizontal_circle_outline, text: "Send initialization transaction", type: "disabled"};
        executionSteps[2] = {icon: ic_download_outline, text: "Send claim transaction", type: "disabled"};
        if(isQuoteExpiredClaim) {
            executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
            executionSteps[1] = {icon: ic_watch_later_outline, text: "Initialization transaction expired", type: "failed"};
        }
        if(isClaimCommittable) executionSteps[1] = {icon: ic_swap_horizontal_circle_outline, text: committing ? "Sending initialization transaction" : "Send initialization transaction", type: "loading"};
        if(isClaimClaimable) {
            executionSteps[1] = {icon: ic_check_circle_outline, text: "Initialization success", type: "success"};
            executionSteps[2] = {icon: ic_download_outline, text: claiming ? "Sending claim transaction" : "Send claim transaction", type: "loading"};
        }
        if(isSuccess) {
            executionSteps[1] = {icon: ic_check_circle_outline, text: "Initialization success", type: "success"};
            executionSteps[2] = {icon: ic_verified_outline, text: "Claim success", type: "success"};
        }
        if(isFailed) {
            executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
            executionSteps[1] = {icon: ic_check_circle_outline, text: "Initialization success", type: "success"};
            executionSteps[2] = {icon: ic_watch_later_outline, text: "Swap expired", type: "failed"};
        }
    }

    return {
        waitForPayment,
        paymentError,
        paymentWaiting,

        onCommit,
        commitError,
        committing,

        onClaim,
        claimError,
        claiming,

        isQuoteExpired,
        isQuoteExpiredClaim,
        isFailed,
        isCreated,
        isLpAutoCommiting,
        isClaimCommittable,
        isClaimClaimable,
        isClaimable,
        isSuccess,
        isWaitingForWatchtowerClaim: !isAlreadyClaimable && isWaitingForWatchtowerClaim,

        executionSteps,
        canClaimInOneShot,

        requiresDestinationWalletConnected: quote.getType()===SwapType.FROM_BTCLN
    }
}