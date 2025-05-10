import {AbstractSigner, ISwap} from "@atomiqlabs/sdk";
import { ChainDataContext } from "../context/ChainDataContext";
import {ChainWalletData} from "../ChainDataProvider";
import {useContext} from "react";

export function useSmartChainWallet(swap: ISwap, requireSameAsInitiator?: boolean): ChainWalletData<AbstractSigner>["wallet"] {
    const chainsData = useContext(ChainDataContext);
    const wallet: ChainWalletData<AbstractSigner>["wallet"] = chainsData[swap.chainIdentifier].wallet;
    if(wallet==null) return undefined;
    if(requireSameAsInitiator) {
        if(wallet?.instance?.getAddress()!==swap._getInitiator()) return null;
    }
    return wallet;
}
