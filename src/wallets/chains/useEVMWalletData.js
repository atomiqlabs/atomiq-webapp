import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FEConstants } from "../../FEConstants";
import { darkTheme, getDefaultConfig, RainbowKitProvider, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useWalletClient, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EVMSigner } from "@atomiqlabs/chain-evm";
import { BrowserProvider } from "ethers";
import '@rainbow-me/rainbowkit/styles.css';
const citreaTestnetBlockscout = {
    name: "Blockscout - Citrea Testnet",
    url: "https://explorer.testnet.citrea.xyz/"
};
const citreaTestnetChain = {
    blockExplorers: {
        "Blockscout": citreaTestnetBlockscout,
        default: citreaTestnetBlockscout
    },
    blockTime: 2 * 1000,
    id: 5115,
    name: "Citrea Testnet",
    nativeCurrency: {
        name: "Citrea BTC",
        symbol: "cBTC",
        decimals: 18
    },
    rpcUrls: {
        "Citrea public": { http: ["https://rpc.testnet.citrea.xyz"] },
        default: { http: ["https://rpc.testnet.citrea.xyz"] }
    },
    testnet: true
};
const config = getDefaultConfig({
    appName: "atomiq.exchange",
    projectId: "2a38c0968b372694c0b2827a6e05b1f5",
    chains: [citreaTestnetChain],
    ssr: false
});
const queryClient = new QueryClient();
export function EVMWalletWrapper(props) {
    return (_jsx(WagmiProvider, { config: config, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(RainbowKitProvider, { modalSize: "compact", theme: darkTheme({
                    accentColor: "#D147A6FF",
                    accentColorForeground: "white",
                    borderRadius: "small",
                    overlayBlur: "none"
                }), children: props.children }) }) }));
}
export function useEVMWalletData() {
    const { openConnectModal } = useConnectModal();
    const { disconnect } = useDisconnect();
    const { connector, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const [evmSigner, setEvmSigner] = useState();
    useEffect(() => {
        setEvmSigner(null);
        if (walletClient == null || !isConnected)
            return;
        let cancelled = false;
        const browserProvider = new BrowserProvider(walletClient);
        browserProvider.getSigner().then(signer => {
            if (cancelled)
                return;
            setEvmSigner(new EVMSigner(signer, signer.address, true));
        });
        return () => {
            cancelled = true;
        };
    }, [walletClient, isConnected]);
    const [icon, setIcon] = useState();
    useEffect(() => {
        console.log(connector);
        if (connector == null)
            return;
        let cancelled = false;
        const icon = connector.icon ?? connector.iconUrl ?? connector.rkDetails?.iconUrl;
        if (typeof (icon) === "string") {
            setIcon(icon);
        }
        else if (typeof (icon) === "function") {
            const result = icon();
            if (typeof (result) === "string") {
                setIcon(result);
            }
            else if (result instanceof Promise) {
                result.then(val => {
                    if (cancelled)
                        return;
                    setIcon(val);
                });
            }
        }
        return () => {
            cancelled = true;
        };
    }, [connector?.icon, connector?.iconUrl, isConnected, evmSigner]);
    const [shouldOpenWalletModal, setShouldOpenWalletModal] = useState(false);
    useEffect(() => {
        if (shouldOpenWalletModal && openConnectModal != null) {
            openConnectModal();
            setShouldOpenWalletModal(false);
        }
    }, [shouldOpenWalletModal, openConnectModal]);
    const changeWallet = useCallback(() => {
        disconnect();
        setShouldOpenWalletModal(true);
    }, [disconnect]);
    const connect = useCallback(() => {
        openConnectModal();
    }, [openConnectModal]);
    return useMemo(() => {
        if (!FEConstants.allowedChains.has("CITREA"))
            return [null];
        return [{
                chain: {
                    name: "Citrea",
                    icon: "/icons/chains/CITREA.svg",
                },
                wallet: evmSigner == null ? null : {
                    name: connector?.name,
                    icon,
                    instance: evmSigner,
                    address: evmSigner.getAddress()
                },
                id: "CITREA",
                disconnect: () => disconnect(),
                connect,
                changeWallet,
                swapperOptions: {
                    rpcUrl: FEConstants.citreaRpc,
                    chainType: FEConstants.citreaChainType
                }
            }];
    }, [evmSigner, connect, connector, disconnect, icon]);
}
