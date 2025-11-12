import { useContext } from "react";
import { ChainsContext } from "../../../context/ChainsContext";
import { useWithAwait } from "../../utils/useWithAwait";
import { IFromBTCSwap, IToBTCSwap, toTokenAmount } from "@atomiqlabs/sdk";
import { toTokenIdentifier } from "../../../utils/Tokens";
import { FEConstants } from "../../../FEConstants";
import { SwapperContext } from "../../../context/SwapperContext";
export function useCheckAdditionalGas(quote) {
    const { swapper } = useContext(SwapperContext);
    const chainsData = useContext(ChainsContext);
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
