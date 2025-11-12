import {useContext} from "react";
import {ChainsContext} from "../../../context/ChainsContext";
import {useWithAwait} from "../../utils/useWithAwait";
import {IFromBTCSwap, ISwap, IToBTCSwap, TokenAmount, toTokenAmount} from "@atomiqlabs/sdk";
import {getChainIdentifierForCurrency, toTokenIdentifier} from "../../../utils/Tokens";
import {Chain} from "../../../providers/ChainsProvider";
import {FEConstants} from "../../../FEConstants";
import {SwapperContext} from "../../../context/SwapperContext";


export function useCheckAdditionalGas(quote: ISwap) {
  const {swapper} = useContext(SwapperContext);
  const chainsData = useContext(ChainsContext);
  const smartChain = chainsData.chains[quote.chainIdentifier];

  const [additionalGasTokensNeeded] = useWithAwait(async () => {
    if (swapper == null) return;
    if (quote == null || quote.isInitiated()) return;
    let result: {
      enoughBalance: boolean;
      balance: TokenAmount;
      required: TokenAmount;
    };
    let address: string;
    if (quote instanceof IToBTCSwap) {
      result = await quote.hasEnoughForTxFees();
      address = quote._getInitiator();
    } else if (quote instanceof IFromBTCSwap) {
      result = await quote.hasEnoughForTxFees();
      address = quote._getInitiator();
    } else {
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