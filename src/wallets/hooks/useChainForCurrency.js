import { useContext } from "react";
import { isBtcToken } from "@atomiqlabs/sdk";
import { ChainDataContext } from "../context/ChainDataContext";
export function getChainIdentifierForCurrency(token) {
    if (isBtcToken(token)) {
        if (token.lightning) {
            return "LIGHTNING";
        }
        else {
            return "BITCOIN";
        }
    }
    else {
        return token.chainId;
    }
}
export function useChainForCurrency(token) {
    const connectedWallets = useContext(ChainDataContext);
    return connectedWallets[getChainIdentifierForCurrency(token)];
}
