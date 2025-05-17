import { useContext, useMemo, useRef } from "react";
import { BitcoinNetwork, fromHumanReadableString, isBtcToken, isLNURLWithdraw, isSCToken, SpvFromBTCSwap, SwapType } from "@atomiqlabs/sdk";
import { SwapsContext } from "../context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
import { useChainForCurrency } from "../../wallets/hooks/useChainForCurrency";
import { Address, NETWORK, TEST_NETWORK } from "@scure/btc-signer";
import { FEConstants } from "../../FEConstants";
import * as randomBytes from "randombytes";
import { toTokenIdentifier } from "../../tokens/Tokens";
const btcFeeMaxOffset = 3;
const btcFeeMaxMultiple = 1.5;
const RANDOM_BTC_ADDRESS = Address(FEConstants.bitcoinNetwork === BitcoinNetwork.MAINNET ? NETWORK : TEST_NETWORK).encode({
    type: "wsh",
    hash: randomBytes(32)
});
function getRandomAddress(swapper, token) {
    if (isSCToken(token)) {
        return swapper.chains[token.chainId].chainInterface.randomAddress();
    }
    else if (isBtcToken(token) && !token.lightning) {
        return RANDOM_BTC_ADDRESS;
    }
    return null;
}
export function useQuote(amount, exactIn, inToken, outToken, address, gasDropAmount, btcFeeRate, pause) {
    const { swapper } = useContext(SwapsContext);
    const inputChain = useChainForCurrency(inToken);
    let inputAddress = inputChain?.wallet?.address;
    if (inToken != null && isBtcToken(inToken) && inToken.lightning && isLNURLWithdraw(address)) {
        inputAddress = address;
        address = null;
    }
    const outputChain = useChainForCurrency(outToken);
    address ?? (address = outputChain?.wallet?.address);
    const [swapType, swapInfo] = useMemo(() => {
        if (swapper != null && inToken != null && outToken != null)
            try {
                const swapType = swapper?.getSwapType(inToken, outToken);
                return [swapType, swapper.SwapTypeInfo[swapType]];
            }
            catch (e) { }
        return [null, null];
    }, [swapper, inToken, outToken]);
    const [result, loading, error, refresh] = useWithAwait(() => {
        console.log("useQuote(): amount: " + amount + " exactIn: " + exactIn + " inToken: " + inToken?.ticker + " outToken: " + outToken?.ticker + " inputAddr: " + inputAddress + " outputAddr: " + address + " gasDropAmount: " + gasDropAmount + " btcFeeRate: " + btcFeeRate + " pause: " + pause);
        if (swapper == null || inToken == null || outToken == null || amount == null || pause)
            return null;
        const outAddress = address ?? getRandomAddress(swapper, outToken);
        if (outAddress == null)
            return null;
        const inAddress = inputAddress ?? getRandomAddress(swapper, inToken);
        const rawAmount = fromHumanReadableString(amount, exactIn ? inToken : outToken);
        return swapper.create(inToken, outToken, rawAmount, exactIn, inAddress, outAddress, {
            gasAmount: gasDropAmount,
            maxAllowedNetworkFeeRate: btcFeeRate == null ? null : btcFeeMaxOffset + (btcFeeRate * btcFeeMaxMultiple),
            unsafeZeroWatchtowerFee: swapType === SwapType.SPV_VAULT_FROM_BTC
        }).then(quote => { return { quote, random: address == null }; });
    }, [swapper, amount, exactIn, toTokenIdentifier(inToken), toTokenIdentifier(outToken), inputAddress, address, gasDropAmount, swapType === SwapType.SPV_VAULT_FROM_BTC ? btcFeeRate : null], false, null, (manual, currDeps, prevDeps, prevValue) => {
        if (manual)
            return true;
        const onlyFeeRateChanged = currDeps.every((val, index) => index === 8 ? true : prevDeps[index] === val);
        if (onlyFeeRateChanged) {
            const oldFeeRate = prevDeps[8];
            const newFeeRate = currDeps[8];
            if (oldFeeRate === newFeeRate)
                return false;
            if (newFeeRate == null)
                return false;
            if (prevValue != null && prevValue.quote instanceof SpvFromBTCSwap) {
                if (prevValue.quote.minimumBtcFeeRate <= btcFeeMaxOffset + (newFeeRate * btcFeeMaxMultiple))
                    return false;
            }
        }
        return true;
    }, true);
    const latestUnpausedRefreshRef = useRef();
    useMemo(() => {
        if (pause) {
            latestUnpausedRefreshRef.current = refresh;
        }
        else {
            if (latestUnpausedRefreshRef.current !== refresh)
                refresh();
        }
    }, [refresh, pause]);
    return [refresh, result?.quote, result?.random, loading, error];
}
