import {useContext} from "react";
import {isBtcToken, Token} from "@atomiqlabs/sdk";
import {ChainDataContext} from "../context/ChainDataContext";
import {ChainWalletData} from "../ChainDataProvider";

export function getChainIdentifierForCurrency(token: Token): string {
    if(isBtcToken(token)) {
        if(token.lightning) {
            return "LIGHTNING";
        } else {
            return "BITCOIN";
        }
    } else {
        return token.chainId;
    }
}

export function useChainForCurrency(token: Token): ChainWalletData<any> {
    const connectedWallets = useContext(ChainDataContext);
    return connectedWallets[getChainIdentifierForCurrency(token)];
}
