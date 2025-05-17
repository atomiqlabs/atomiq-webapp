import { useContext, useMemo } from "react";
import { BitcoinNetwork, fromHumanReadableString, isBtcToken, isLNURLWithdraw, isSCToken, SwapType } from "@atomiqlabs/sdk";
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
    const swapType = useMemo(() => {
        if (swapper != null && inToken != null && outToken != null)
            try {
                return swapper?.getSwapType(inToken, outToken);
            }
            catch (e) { }
        return null;
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
        return swapper.swap(inToken, outToken, rawAmount, exactIn, inAddress, outAddress, {
            gasAmount: gasDropAmount,
            maxAllowedNetworkFeeRate: btcFeeRate == null ? null : btcFeeMaxOffset + (btcFeeRate * btcFeeMaxMultiple),
            unsafeZeroWatchtowerFee: swapType === SwapType.SPV_VAULT_FROM_BTC
        }).then(quote => { return { quote, random: address == null }; });
    }, [swapper, amount, exactIn, toTokenIdentifier(inToken), toTokenIdentifier(outToken), inputAddress, address, gasDropAmount], false, null, pause, true);
    return [refresh, result?.quote, result?.random, loading, error];
}
