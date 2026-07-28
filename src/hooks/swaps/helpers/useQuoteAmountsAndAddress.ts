import {isSwapType, ISwap, SwapType, Token, TokenAmount} from "@atomiqlabs/sdk";
import {useMemo} from "react";
import {usePricing} from "../../pricing/usePricing";
import {useChain} from "../../chains/useChain";
import {Chain} from "../../../providers/ChainsProvider";
import {FEConstants} from "../../../FEConstants";
import {truncateAddress} from "../../../utils/Utils";
import {Chains} from "../../../utils/Chains";

export type QuoteAmountsAndAddress = {
  input?: {
    amount: TokenAmount,
    token: Token,
    chain: {name: string, icon: string},
    usdValue?: string
  },
  output?: {
    amount: TokenAmount,
    token: Token,
    gasAmount: TokenAmount,
    chain: {name: string, icon: string},
    usdValue?: string
  },
  address?: {
    full: string,
    short: string
  }
};

export function useQuoteAmountsAndAddress(quote: ISwap): QuoteAmountsAndAddress {
  const inputUsdValue = usePricing(quote?.getInput().amount, quote?.getInput().token);
  const outputUsdValue = usePricing(quote?.getOutput().amount, quote?.getOutput().token);

  return {
    input: useMemo(() => (quote==null ? undefined : {
      amount: quote.getInput(),
      token: quote.getInputToken(),
      usdValue: quote.getInput().isUnknown ? "$???" : inputUsdValue ? FEConstants.USDollar.format(inputUsdValue) : undefined,
      chain: Chains[quote?.getInputToken()?.chainId]
    }), [quote, inputUsdValue]),
    output: useMemo(() => (quote==null ? undefined : {
      amount: quote.getOutput(),
      token: quote.getOutputToken(),
      gasAmount: isSwapType(quote, SwapType.FROM_BTCLN_AUTO) || isSwapType(quote, SwapType.SPV_VAULT_FROM_BTC) ? quote.getGasDropOutput() : undefined,
      usdValue: quote.getOutput().isUnknown ? "$???" : outputUsdValue ? FEConstants.USDollar.format(outputUsdValue) : undefined,
      chain: Chains[quote?.getOutputToken()?.chainId]
    }), [quote, outputUsdValue]),
    address: useMemo(() => {
      if(quote==null) return undefined;
      const outputAddress = quote.getOutputAddress();
      return {
        full: outputAddress ?? "Unknown",
        short: truncateAddress(outputAddress) ?? "Unknown"
      };
    }, [quote])
  };
}
