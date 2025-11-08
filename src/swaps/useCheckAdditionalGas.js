import { useContext } from "react";
import { ChainDataContext } from "../wallets/context/ChainDataContext";
import { useWithAwait } from "../utils/hooks/useWithAwait";
import { IFromBTCSwap, IToBTCSwap, toTokenAmount } from "@atomiqlabs/sdk";
import { toTokenIdentifier } from "../tokens/Tokens";
import { FEConstants } from "../FEConstants";
import { SwapsContext } from "./context/SwapsContext";
export function useCheckAdditionalGas(quote) {
    const { swapper } = useContext(SwapsContext);
    const chainsData = useContext(ChainDataContext);
    const smartChain = chainsData.chains[quote.chainIdentifier];
    const [additionalGasTokensNeeded] = useWithAwait(async () => {
        if (swapper == null)
            return;
        if (quote == null || quote.isInitiated())
            return;
        let result;
        let address;
        if (quote instanceof IToBTCSwap) {
            result = await quote.hasEnoughForTxFees();
            address = quote._getInitiator();
        }
        else if (quote instanceof IFromBTCSwap) {
            result = await quote.hasEnoughForTxFees();
            address = quote._getInitiator();
        }
        else {
            return;
        }
        if (!result.enoughBalance) {
            if (smartChain.wallet?.address == address) {
                const amountDelta = FEConstants.scBalances[toTokenIdentifier(result.required.token)].optimal +
                    result.required.rawAmount -
                    result.balance.rawAmount;
                return toTokenAmount(amountDelta, result.required.token, swapper.prices);
            }
        }
    }, [quote, smartChain, swapper]);
    return additionalGasTokensNeeded;
}
