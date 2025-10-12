import { useContext } from "react";
import { Token } from "@atomiqlabs/sdk";
import { ChainDataContext } from "../context/ChainDataContext";
import { ChainWalletData } from "../ChainDataProvider";
import { getChainIdentifierForCurrency } from "../../tokens/Tokens";

export function useChain(tokenOrChainId: Token | string): ChainWalletData<any> {
  const connectedWallets = useContext(ChainDataContext);
  return connectedWallets.chains[typeof(tokenOrChainId)==="string" ? tokenOrChainId : getChainIdentifierForCurrency(tokenOrChainId)];
}
