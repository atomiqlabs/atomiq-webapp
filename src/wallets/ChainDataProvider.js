import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SolanaWalletWrapper, useSolanaWalletData } from "./chains/useSolanaWalletData";
import { useBitcoinWalletData } from "./chains/useBitcoinWalletData";
import { useStarknetWalletData } from "./chains/useStarknetWalletData";
import { useLightningWalletData } from "./chains/useLightningWalletData";
import { ChainDataContext } from "./context/ChainDataContext";
import { useMemo } from "react";
function WrappedChainDataProvider(props) {
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData();
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [lightningChain] = useLightningWalletData();
    return (_jsxs(ChainDataContext.Provider, { value: useMemo(() => ({
            BITCOIN: bitcoinChain,
            LIGHTNING: lightningChain,
            SOLANA: solanaChain,
            STARKNET: starknetChain
        }), [bitcoinChain, lightningChain, solanaChain, starknetChain]), children: [bitcoinModal, props.children] }));
}
export function ChainDataProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainDataProvider, { children: props.children }) }));
}
