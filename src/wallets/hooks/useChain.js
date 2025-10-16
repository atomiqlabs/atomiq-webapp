import { useContext } from "react";
import { ChainDataContext } from "../context/ChainDataContext";
import { getChainIdentifierForCurrency } from "../../tokens/Tokens";
export function useChain(tokenOrChainId) {
    const connectedWallets = useContext(ChainDataContext);
    return connectedWallets.chains[typeof (tokenOrChainId) === "string" ? tokenOrChainId : getChainIdentifierForCurrency(tokenOrChainId)];
}
