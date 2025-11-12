import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SolanaWalletWrapper, useSolanaChain } from './chains/useSolanaChain';
import { ChainsContext } from '../context/ChainsContext';
import { FEConstants } from '../FEConstants';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useStarknetChain } from "./chains/useStarknetChain";
import { useLightningNetwork } from "./chains/useLightningNetwork";
import { useBitcoinChain } from "./chains/useBitcoinChain";
import { ConnectWalletModal } from "../components/wallets/ConnectWalletModal";
function WrappedChainsProvider(props) {
    const solanaResult = useSolanaChain(FEConstants.chainsConfiguration.enableSolana);
    const starknetResult = useStarknetChain(FEConstants.chainsConfiguration.enableStarknet);
    const lightningResult = useLightningNetwork(FEConstants.chainsConfiguration.enableLightning);
    const bitcoinResult = useBitcoinChain(FEConstants.chainsConfiguration.enableBitcoin, {
        STARKNET: starknetResult?.wallet?.name,
        SOLANA: solanaResult?.wallet?.name,
    });
    const chains = useMemo(() => {
        const chainsData = {};
        // Add wallets and chain data based on configuration
        if (FEConstants.chainsConfiguration.enableSolana && solanaResult)
            chainsData.SOLANA = solanaResult;
        if (FEConstants.chainsConfiguration.enableStarknet && starknetResult)
            chainsData.STARKNET = starknetResult;
        if (FEConstants.chainsConfiguration.enableLightning && lightningResult)
            chainsData.LIGHTNING = lightningResult;
        if (FEConstants.chainsConfiguration.enableBitcoin && bitcoinResult)
            chainsData.BITCOIN = bitcoinResult;
        return chainsData;
    }, [solanaResult, starknetResult, lightningResult, bitcoinResult]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalChainId, setModalChainId] = useState();
    const modalSelectedChainData = useMemo(() => chains[modalChainId], [modalChainId]);
    const connectWalletPromiseCbk = useRef();
    const connectWallet = useCallback((chainIdentifier) => {
        setModalOpen(true);
        setModalChainId(chainIdentifier);
        if (connectWalletPromiseCbk.current)
            connectWalletPromiseCbk.current(false);
        return new Promise((resolve) => {
            connectWalletPromiseCbk.current = resolve;
        });
    }, [chains]);
    const disconnectWallet = useCallback(async (chainIdentifier) => {
        const chain = chains[chainIdentifier];
        if (!chain)
            return;
        await chain._disconnect();
    }, [chains]);
    const changeWallet = useCallback(async (chainIdentifier) => {
        const chain = chains[chainIdentifier];
        if (!chain || !chain._disconnect)
            return;
        await chain._disconnect();
        setModalOpen(true);
        setModalChainId(chainIdentifier);
    }, [chains]);
    return (_jsxs(ChainsContext.Provider, { value: {
            chains,
            connectWallet,
            disconnectWallet,
            changeWallet,
        }, children: [_jsx(ConnectWalletModal, { visible: modalOpen, onClose: () => {
                    setModalOpen(false);
                    if (connectWalletPromiseCbk.current) {
                        connectWalletPromiseCbk.current(false);
                        connectWalletPromiseCbk.current = null;
                    }
                }, title: `Select a ${modalSelectedChainData?.chain.name ?? modalChainId} Wallet`, installedWallets: modalSelectedChainData?.installedWallets ?? [], notInstalledWallets: modalSelectedChainData?.nonInstalledWallets ?? [], onWalletClick: (wallet) => {
                    if (modalSelectedChainData == null)
                        return;
                    (async () => {
                        try {
                            await modalSelectedChainData._connectWallet(wallet.name);
                            setModalOpen(false);
                            if (connectWalletPromiseCbk.current) {
                                connectWalletPromiseCbk.current(true);
                                connectWalletPromiseCbk.current = null;
                            }
                        }
                        catch (e) {
                            alert(`Failed to connect to ${wallet.name}. This wallet may not be available or compatible with the ${modalSelectedChainData.chain.name} network.`);
                        }
                    })();
                } }), props.children] }));
}
export function ChainsProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainsProvider, { children: props.children }) }));
}
