import { useContext } from "react";
import { isBtcToken } from "@atomiqlabs/sdk";
import { WalletContext } from "../context/WalletContext";
export function useChainForCurrency(token) {
    const connectedWallets = useContext(WalletContext);
    if (isBtcToken(token)) {
        if (token.lightning) {
            return connectedWallets["LIGHTNING"];
        }
        else {
            return connectedWallets["BITCOIN"];
        }
    }
    else {
        return connectedWallets[token.chainId];
    }
}
