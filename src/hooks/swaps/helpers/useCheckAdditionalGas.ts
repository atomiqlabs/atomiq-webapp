import {useContext} from "react";
import {ChainsContext} from "../../../context/ChainsContext";
import {useWithAwait} from "../../utils/useWithAwait";
import {IEscrowSelfInitSwap, isSCToken, ISwap, TokenAmount, toTokenAmount} from "@atomiqlabs/sdk";
import {SwapperContext} from "../../../context/SwapperContext";
import {ChainsConfig} from "../../../data/ChainsConfig";


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
    if (quote instanceof IEscrowSelfInitSwap) {
      result = await quote.hasEnoughForTxFees();
      address = quote._getInitiator();
    } else {
      return;
    }
    if (!result.enoughBalance) {
      if (smartChain.wallet?.address == address && isSCToken(result.required.token)) {
        const token = result.required.token;
        const optimalAmount: bigint = ChainsConfig[token.chainId]?.assetBalances?.[token.address]?.optimal;
        console.log("useCheckAdditionalGas(): optimalAmount: ", optimalAmount, token);
        if(optimalAmount == null) return;
        const amountDelta = optimalAmount +
          result.required.rawAmount -
          result.balance.rawAmount;
        return toTokenAmount(amountDelta, result.required.token, swapper.prices);
      }
    }
  }, [quote, smartChain, swapper]);

  return additionalGasTokensNeeded;
}