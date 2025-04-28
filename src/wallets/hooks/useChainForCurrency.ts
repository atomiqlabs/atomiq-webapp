import {useContext} from "react";
import {isBtcToken, Token} from "@atomiqlabs/sdk";
import {WalletContext} from "../context/WalletContext";
import {ChainWalletData} from "../WalletProvider";

export function useChainForCurrency(token: Token): ChainWalletData<any> {
    const connectedWallets = useContext(WalletContext);

    if(isBtcToken(token)) {
        if(token.lightning) {
            return connectedWallets["LIGHTNING"];
        } else {
            return connectedWallets["BITCOIN"];
        }
    } else {
        return connectedWallets[token.chainId];
    }
}
