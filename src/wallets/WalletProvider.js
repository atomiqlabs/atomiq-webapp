import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SolanaWalletWrapper, useSolanaWalletData } from "./hooks/useSolanaWalletData";
import { useBitcoinWalletData } from "./hooks/useBitcoinWalletData";
import { useStarknetWalletData } from "./hooks/useStarknetWalletData";
import { useLightningWalletData } from "./hooks/useLightningWalletData";
import { WalletContext } from "./context/WalletContext";
import { useMemo } from "react";
function WrappedWalletProvider(props) {
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData();
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [lightningChain] = useLightningWalletData();
    return (_jsxs(WalletContext.Provider, { value: useMemo(() => ({
            BITCOIN: bitcoinChain,
            LIGHTNING: lightningChain,
            SOLANA: solanaChain,
            STARKNET: starknetChain
        }), [bitcoinChain, lightningChain, solanaChain, starknetChain]), children: [bitcoinModal, props.children] }));
}
export function WalletProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedWalletProvider, { children: props.children }) }));
}
