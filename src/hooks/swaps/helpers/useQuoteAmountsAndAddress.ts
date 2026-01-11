import {isSwapType, ISwap, SwapType, TokenAmount} from "@atomiqlabs/sdk";
import {useMemo} from "react";
import {usePricing} from "../../pricing/usePricing";
import {useChain} from "../../chains/useChain";
import {Chain} from "../../../providers/ChainsProvider";
import {FEConstants} from "../../../FEConstants";

export type QuoteAmountsAndAddress = {
  input?: {
    amount: TokenAmount,
    chain: Chain<any>,
    usdValue?: string
  },
  output?: {
    amount: TokenAmount,
    gasAmount: TokenAmount,
    chain: Chain<any>,
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

  const inputChain = useChain(quote?.getInput().token);
  const outputChain = useChain(quote?.getOutput().token);

  return {
    input: useMemo(() => (quote==null ? undefined : {
      amount: quote.getInput(),
      usdValue: inputUsdValue ? FEConstants.USDollar.format(inputUsdValue) : undefined,
      chain: inputChain
    }), [quote, inputUsdValue, inputChain]),
    output: useMemo(() => (quote==null ? undefined : {
      amount: quote.getOutput(),
      gasAmount: isSwapType(quote, SwapType.FROM_BTCLN_AUTO) || isSwapType(quote, SwapType.SPV_VAULT_FROM_BTC) ? quote.getGasDropOutput() : undefined,
      usdValue: outputUsdValue ? FEConstants.USDollar.format(outputUsdValue) : undefined,
      chain: outputChain
    }), [quote, outputUsdValue, outputChain]),
    address: useMemo(() => (quote==null ? undefined : {
      full: quote.getOutputAddress(),
      short: `${quote.getOutputAddress().slice(0, 5)}...${quote.getOutputAddress().slice(-5)}`
    }), [quote])
  };
}
