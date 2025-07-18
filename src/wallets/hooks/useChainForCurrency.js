import { useContext } from "react";
import { ChainDataContext } from "../context/ChainDataContext";
import { getChainIdentifierForCurrency } from "../../tokens/Tokens";
export function useChainForCurrency(token) {
  const connectedWallets = useContext(ChainDataContext);
  return connectedWallets[getChainIdentifierForCurrency(token)];
}
