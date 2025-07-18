import { useContext } from "react";
import { isBtcToken, Token } from "@atomiqlabs/sdk";
import { ChainDataContext } from "../context/ChainDataContext";
import { ChainWalletData } from "../ChainDataProvider";
import { getChainIdentifierForCurrency } from "../../tokens/Tokens";

export function useChainForCurrency(token: Token): ChainWalletData<any> {
  const connectedWallets = useContext(ChainDataContext);
  return connectedWallets[getChainIdentifierForCurrency(token)];
}
