import { ChainDataContext } from "../context/ChainDataContext";
import { useContext } from "react";
export function useSmartChainWallet(swap, requireSameAsInitiator) {
  const chainsData = useContext(ChainDataContext);
  const wallet = chainsData[swap.chainIdentifier].wallet;
  if (wallet == null) return undefined;
  if (requireSameAsInitiator) {
    if (wallet?.instance?.getAddress() !== swap._getInitiator()) return null;
  }
  return wallet;
}
