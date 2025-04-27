import {FromBTCLNSwap, FromBTCLNSwapState} from "@atomiqlabs/sdk";
import {useContext, useEffect} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {useSwapState} from "./useSwapState";
import {useStateRef} from "./hooks/useStateRef";
import {useAbortSignalRef} from "./hooks/useAbortSignal";
import {useAsync} from "./hooks/useAsync";
import {SingleStep} from "../components/StepByStep";

import {ic_hourglass_top_outline} from 'react-icons-kit/md/ic_hourglass_top_outline';
import {ic_refresh} from 'react-icons-kit/md/ic_refresh';
import {ic_flash_on_outline} from 'react-icons-kit/md/ic_flash_on_outline';
import {ic_hourglass_disabled_outline} from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import {ic_watch_later_outline} from 'react-icons-kit/md/ic_watch_later_outline';
import {ic_check_circle_outline} from 'react-icons-kit/md/ic_check_circle_outline';
import {ic_swap_horizontal_circle_outline} from 'react-icons-kit/md/ic_swap_horizontal_circle_outline';
import {ic_verified_outline} from 'react-icons-kit/md/ic_verified_outline';
import {ic_download_outline} from 'react-icons-kit/md/ic_download_outline';
import {StarknetWalletContext} from "../context/StarknetWalletContext";
import {timeoutPromise} from "./Utils";

export function useFromBtcLnQuote(
    quote: FromBTCLNSwap<any>,
    setAmountLock: (isLocked: boolean) => void,
) {
    const {getSigner} = useContext(SwapsContext);
    const signer = getSigner(quote)

    const canClaimInOneShot = quote?.canCommitAndClaimInOneShot();

    const {state, totalQuoteTime, quoteTimeRemaining, isInitiated} = useSwapState(quote);

    const setAmountLockRef = useStateRef(setAmountLock);
    const abortSignalRef = useAbortSignalRef([quote]);

    const [waitForPayment, paymentWaiting, paymentSuccess, paymentError] = useAsync(() => {
        if(setAmountLockRef.current!=null) setAmountLockRef.current(true);
        return quote.waitForPayment(abortSignalRef.current, 2).then(() => true).catch(err => {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
            throw err;
        });
    }, [quote]);

    const {starknetWalletData} = useContext(StarknetWalletContext);
    const starknetWalletRef = useStateRef(starknetWalletData);

    const [onCommit, committing, commitSuccess, commitError] = useAsync(
        async (skipChecks?: boolean) => {
            if(canClaimInOneShot) {
                await quote.commitAndClaim(signer, null, skipChecks).then(txs => txs[0]);
            } else {
                await quote.commit(signer, null, skipChecks);
                console.log("useFromBtcLnQuote(): onCommit(): Quote committed, connected starknet wallet: ", starknetWalletRef.current?.id);
                if(quote.chainIdentifier==="STARKNET" && starknetWalletRef.current?.id==="argentX") await timeoutPromise(5000);
            }
        },
        [quote, signer]
    );

    const [onClaim, claiming, claimSuccess, claimError] = useAsync(
        (skipChecks?: boolean) => quote.claim(signer),
        [quote, signer]
    );

    const isQuoteExpired = state === FromBTCLNSwapState.QUOTE_EXPIRED ||
        (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !committing && !paymentWaiting);

    const isQuoteExpiredClaim = isQuoteExpired && quote.signatureData!=null;

    const isFailed = state===FromBTCLNSwapState.FAILED ||
        state===FromBTCLNSwapState.EXPIRED;

    const isCreated = state===FromBTCLNSwapState.PR_CREATED ||
        (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && paymentWaiting);

    const isClaimCommittable = state===FromBTCLNSwapState.PR_PAID ||
        (state===FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && committing) || committing;

    const isClaimClaimable = state===FromBTCLNSwapState.CLAIM_COMMITED && !committing;

    const isClaimable = isClaimCommittable || isClaimClaimable;

    const isSuccess = state===FromBTCLNSwapState.CLAIM_CLAIMED;

    useEffect(() => {
        if(isQuoteExpired || isFailed || isSuccess) {
            if(setAmountLockRef.current!=null) setAmountLockRef.current(false);
        }
    }, [isQuoteExpired, isFailed, isSuccess]);

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

    if(canClaimInOneShot) {
        if(isQuoteExpiredClaim) {
            executionSteps[0] = {icon: ic_refresh, text: "Lightning payment reverted", type: "failed"};
            executionSteps[1] = {icon: ic_watch_later_outline, text: "Claim transaction expired", type: "failed"};
        }
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
        isClaimCommittable,
        isClaimClaimable,
        isClaimable,
        isSuccess,

        executionSteps
    }
}