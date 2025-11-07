import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { GenericWalletModal } from './shared/GenericWalletModal';
import { useChainWalletSystem } from './hooks/useChainWalletSystem';
import { FEConstants } from '../FEConstants';
import { useCallback, useMemo, useRef, useState } from 'react';
function WrappedChainDataProvider(props) {
    const chainsData = useChainWalletSystem(FEConstants.chainsConfiguration);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalChainId, setModalChainId] = useState();
    const modalSelectedChainData = useMemo(() => chainsData[modalChainId], [modalChainId]);
    const connectWalletPromiseCbk = useRef();
    const connectWallet = useCallback((chainIdentifier) => {
        setModalOpen(true);
        setModalChainId(chainIdentifier);
        if (connectWalletPromiseCbk.current)
            connectWalletPromiseCbk.current(false);
        return new Promise((resolve) => {
            connectWalletPromiseCbk.current = resolve;
        });
    }, [chainsData]);
    const disconnectWallet = useCallback(async (chainIdentifier) => {
        const chain = chainsData[chainIdentifier];
        if (!chain)
            return;
        await chain._disconnect();
    }, [chainsData]);
    const changeWallet = useCallback(async (chainIdentifier) => {
        const chain = chainsData[chainIdentifier];
        if (!chain || !chain._disconnect)
            return;
        await chain._disconnect();
        setModalOpen(true);
        setModalChainId(chainIdentifier);
    }, [chainsData]);
    return (_jsxs(ChainDataContext.Provider, { value: {
            chains: chainsData,
            connectWallet,
            disconnectWallet,
            changeWallet,
        }, children: [_jsx(GenericWalletModal, { visible: modalOpen, onClose: () => {
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
export function ChainDataProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainDataProvider, { children: props.children }) }));
}
