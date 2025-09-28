import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { useWalletSystem } from './hooks/useWalletSystem';
function WrappedChainDataProvider(props) {
    const { wallets, modals } = useWalletSystem();
    return (_jsxs(ChainDataContext.Provider, { value: wallets, children: [modals, props.children] }));
}
export function ChainDataProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainDataProvider, { children: props.children }) }));
}
