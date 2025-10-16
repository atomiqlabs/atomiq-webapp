import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SolanaWalletWrapper, useSolanaWalletData } from "./chains/useSolanaWalletData";
import { useBitcoinWalletData } from "./chains/useBitcoinWalletData";
import { useStarknetWalletData } from "./chains/useStarknetWalletData";
import { useLightningWalletData } from "./chains/useLightningWalletData";
import { ChainDataContext } from "./context/ChainDataContext";
import { useMemo } from "react";
import { EVMWalletWrapper, useCitreaWallet, useBotanixWallet, useAlpenWallet } from "./chains/useEVMWallet";
function WrappedChainDataProvider(props) {
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [citreaChain] = useCitreaWallet();
    const [botanixChain] = useBotanixWallet();
    const [alpenChain] = useAlpenWallet();
    const [lightningChain] = useLightningWalletData();
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData(useMemo(() => {
        return {
            STARKNET: starknetChain?.wallet?.name,
            SOLANA: solanaChain?.wallet?.name
        };
    }, [starknetChain?.wallet, solanaChain?.wallet]));
    return (_jsxs(ChainDataContext.Provider, { value: useMemo(() => {
            const res = {
                BITCOIN: bitcoinChain,
                LIGHTNING: lightningChain
            };
            if (solanaChain != null)
                res.SOLANA = solanaChain;
            if (starknetChain != null)
                res.STARKNET = starknetChain;
            if (citreaChain != null)
                res.CITREA = citreaChain;
            if (botanixChain != null)
                res.BOTANIX = botanixChain;
            if (alpenChain != null)
                res.ALPEN = alpenChain;
            return res;
        }, [bitcoinChain, lightningChain, solanaChain, starknetChain, citreaChain, botanixChain, alpenChain]), children: [bitcoinModal, props.children] }));
}
export function ChainDataProvider(props) {
    return (_jsx(EVMWalletWrapper, { children: _jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainDataProvider, { children: props.children }) }) }));
}
