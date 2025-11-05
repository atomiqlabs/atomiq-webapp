import {ChainWalletData} from "../ChainDataProvider";
import {useCallback, useEffect, useMemo, useState} from "react";

import * as React from "react";
import { FEConstants } from "../../FEConstants";
import {darkTheme, getDefaultConfig, RainbowKitProvider, useConnectModal} from "@rainbow-me/rainbowkit";
import {useAccount, useDisconnect, useWalletClient, WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {EVMBrowserSigner, EVMSigner} from "@atomiqlabs/chain-evm";
import {BrowserProvider, JsonRpcProvider} from "ethers";
import '@rainbow-me/rainbowkit/styles.css';

const botanixMainnetRoutescan = {
    name: "Routescan - Botanix Mainnet",
    url: "https://botanixscan.io/"
};

const botanixMainnetChain = {
    blockExplorers: {
        "Routescan": botanixMainnetRoutescan,
        default: botanixMainnetRoutescan
    },
    blockTime: 5*1000,
    id: 3637,
    name: "Botanix",
    nativeCurrency: {
        name: "Bitcoin",
        symbol: "BTC",
        decimals: 18
    },
    rpcUrls: {
        "Botanix public": {http: ["https://rpc.botanixlabs.com"]},
        default: {http: ["https://rpc.botanixlabs.com"]}
    },
    testnet: false
};

const alpenTestnetBlockscout = {
    name: "Blockscout - Alpen Testnet",
    url: "https://explorer.testnet.alpenlabs.io/"
};

const alpenTestnetChain = {
    blockExplorers: {
        "Blockscout": alpenTestnetBlockscout,
        default: alpenTestnetBlockscout
    },
    blockTime: 5*1000,
    id: 2892,
    name: "Alpen Testnet",
    nativeCurrency: {
        name: "Signet BTC",
        symbol: "sBTC",
        decimals: 18
    },
    rpcUrls: {
        "Alpen public": {http: ["https://rpc.testnet.alpenlabs.io"]},
        default: {http: ["https://rpc.testnet.alpenlabs.io"]}
    },
    testnet: true
};

const botanixTestnetBlockscout = {
    name: "Routescan - Botanix Testnet",
    url: "https://testnet.botanixscan.io/"
};

const botanixTestnetChain = {
    blockExplorers: {
        "Routescan": botanixTestnetBlockscout,
        default: botanixTestnetBlockscout
    },
    blockTime: 5*1000,
    id: 3636,
    name: "Botanix Testnet",
    nativeCurrency: {
        name: "Bitcoin",
        symbol: "BTC",
        decimals: 18
    },
    rpcUrls: {
        "Botanix public": {http: ["https://node.botanixlabs.dev"]},
        default: {http: ["https://node.botanixlabs.dev"]}
    },
    testnet: true
};

const citreaTestnetBlockscout = {
    name: "Blockscout - Citrea Testnet",
    url: "https://explorer.testnet.citrea.xyz/"
};

const citreaTestnetChain = {
    blockExplorers: {
        "Blockscout": citreaTestnetBlockscout,
        default: citreaTestnetBlockscout
    },
    blockTime: 2*1000,
    id: 5115,
    name: "Citrea Testnet",
    nativeCurrency: {
        name: "Citrea BTC",
        symbol: "cBTC",
        decimals: 18
    },
    rpcUrls: {
        "Citrea public": {http: ["https://rpc.testnet.citrea.xyz"]},
        default: {http: ["https://rpc.testnet.citrea.xyz"]}
    },
    testnet: true
};

const chains: any = [];
if(FEConstants.alpenRpc!=null) chains.push(alpenTestnetChain);
if(FEConstants.citreaRpc!=null) chains.push(citreaTestnetChain);
if(FEConstants.botanixRpc!=null) chains.push(FEConstants.botanixChainType==="MAINNET" ? botanixMainnetChain : botanixTestnetChain);

const config = getDefaultConfig({
    appName: "atomiq.exchange",
    projectId: "2a38c0968b372694c0b2827a6e05b1f5",
    chains,
    ssr: false
});
const queryClient = new QueryClient();

export function EVMWalletWrapper(props: {
    children: any
}) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider modalSize="compact" theme={darkTheme({
                    accentColor: "#D147A6FF",
                    accentColorForeground: "white",
                    borderRadius: "small",
                    overlayBlur: "none"
                })}>
                    {props.children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

function useEVMWallet(): Omit<ChainWalletData<EVMSigner>, "id" | "chain" | "swapperOptions"> {
    const { openConnectModal } = useConnectModal();
    const { disconnect } = useDisconnect();

    const {connector, isConnected} = useAccount();
    const { data: walletClient } = useWalletClient();

    const [evmSigner, setEvmSigner] = useState<EVMSigner>();
    useEffect(() => {
        setEvmSigner(null);
        if(walletClient==null || !isConnected) return;
        let cancelled = false;
        const browserProvider = new BrowserProvider(walletClient as any);
        browserProvider.getSigner().then(signer => {
            if(cancelled) return;
            setEvmSigner(new EVMBrowserSigner(signer, signer.address));
        });
        return () => {
            cancelled = true;
        }
    }, [walletClient, isConnected]);

    const [icon, setIcon] = useState<string>();
    useEffect(() => {
        if(connector==null) return;
        let cancelled = false;
        const icon = connector.icon ?? connector.iconUrl ?? (connector.rkDetails as any)?.iconUrl;
        if(typeof(icon)==="string") {
            setIcon(icon);
        } else if(typeof(icon)==="function") {
            const result = icon();
            if(typeof(result)==="string") {
                setIcon(result);
            } else if(result instanceof Promise) {
                result.then(val => {
                    if(cancelled) return;
                    setIcon(val)
                });
            }
        }

        return () => {
            cancelled = true;
        }
    }, [connector?.icon, connector?.iconUrl, isConnected, evmSigner]);

    const [shouldOpenWalletModal, setShouldOpenWalletModal] = useState(false);

    useEffect(() => {
        if(shouldOpenWalletModal && openConnectModal!=null) {
            openConnectModal();
            setShouldOpenWalletModal(false);
        }
    }, [shouldOpenWalletModal, openConnectModal]);

    const changeWallet = useCallback(() => {
        disconnect();
        setShouldOpenWalletModal(true);
    }, [disconnect]);

    return useMemo(() => {
        return {
            wallet: evmSigner==null ? null : {
                name: connector?.name,
                icon,
                instance: evmSigner,
                address: evmSigner.getAddress()
            },
            disconnect: () => disconnect(),
            connect: changeWallet,
            changeWallet
        }
    }, [evmSigner, connector, disconnect, icon]);

}

export function useCitreaWallet(): [ChainWalletData<EVMSigner>] {
    const base = useEVMWallet();

    return useMemo(() => {
        if(!FEConstants.allowedChains.has("CITREA")) return [null];
        return [{
            id: "CITREA",
            chain: {
                name: "Citrea",
                icon: "/icons/chains/CITREA.svg",
            },
            swapperOptions: {
                rpcUrl: FEConstants.citreaRpc,
                chainType: FEConstants.citreaChainType
            },
            ...base
        }]
    }, [base]);
}

export function useBotanixWallet(): [ChainWalletData<EVMSigner>] {
    const base = useEVMWallet();

    return useMemo(() => {
        if(!FEConstants.allowedChains.has("BOTANIX")) return [null];
        return [{
            id: "BOTANIX",
            chain: {
                name: "Botanix",
                icon: "/icons/chains/BOTANIX.svg",
            },
            swapperOptions: {
                rpcUrl: FEConstants.botanixRpc,
                chainType: FEConstants.botanixChainType
            },
            ...base
        }]
    }, [base]);
}

export function useAlpenWallet(): [ChainWalletData<EVMSigner>] {
    const base = useEVMWallet();

    return useMemo(() => {
        if(!FEConstants.allowedChains.has("ALPEN")) return [null];
        return [{
            id: "ALPEN",
            chain: {
                name: "Alpen",
                icon: "/icons/chains/ALPEN.svg",
            },
            swapperOptions: {
                rpcUrl: FEConstants.alpenRpc,
                chainType: FEConstants.alpenChainType
            },
            ...base
        }]
    }, [base]);
}
