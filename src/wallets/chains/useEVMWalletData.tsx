import {ChainWalletData} from "../ChainDataProvider";
import {useCallback, useEffect, useMemo, useState} from "react";

import { FEConstants } from "../../FEConstants";
import {EVMBrowserSigner, EVMSigner} from "@atomiqlabs/chain-evm";
import {BrowserProvider} from "ethers";
import {BitcoinNetwork} from "@atomiqlabs/sdk";
import {createAppKit, useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect, useWalletInfo} from "@reown/appkit/react";
import {EthersAdapter} from "@reown/appkit-adapter-ethers";
import {defineChain} from "@reown/appkit/networks";

const Urls = {
    [BitcoinNetwork.MAINNET]: "https://app.atomiq.exchange/",
    [BitcoinNetwork.TESTNET4]: "https://testnet4.atomiq.exchange/",
    [BitcoinNetwork.TESTNET]: "https://devnet.atomiq.exchange/"
}

const projectId = "2a38c0968b372694c0b2827a6e05b1f5";

const metadata = {
    name: "atomiq.exchange",
    description: "atomiq.exchange a bitcoin cross-chain DEX",
    url: Urls[FEConstants.bitcoinNetwork], // origin must match your domain & subdomain
    icons: ["https://app.atomiq.exchange/logo512.png"],
};

const citreaTestnetBlockscout = {
    name: "Blockscout - Citrea Testnet",
    url: "https://explorer.testnet.citrea.xyz/"
};

// @ts-ignore
const citreaTestnetChain = defineChain({
    id: 5115,
    caipNetworkId: 'eip155:5115',
    chainNamespace: 'eip155',
    name: "Citrea Testnet",
    blockExplorers: {
        "Blockscout": citreaTestnetBlockscout,
        default: citreaTestnetBlockscout
    },
    nativeCurrency: {
        name: "Citrea BTC",
        symbol: "cBTC",
        decimals: 18
    },
    rpcUrls: {
        "Citrea public": {http: ["https://rpc.testnet.citrea.xyz"]},
        default: {http: ["https://rpc.testnet.citrea.xyz"]}
    }
});

createAppKit({
    adapters: [new EthersAdapter()],
    metadata,
    networks: [
        citreaTestnetChain
    ],
    projectId,
    features: {
        analytics: false,
        socials: false,
        email: false,
        swaps: false,
        onramp: false,
        receive: false,
        send: false,
        history: false,
        smartSessions: true
    },
    themeVariables: {
    }
});

export function useEVMWalletData(): [ChainWalletData<EVMSigner>] {
    const { open } = useAppKit();
    const { disconnect } = useDisconnect();
    const { isConnected } = useAppKitAccount();
    const { walletInfo } = useWalletInfo();
    const { walletProvider } = useAppKitProvider("eip155");

    const [evmSigner, setEvmSigner] = useState<EVMSigner>();
    useEffect(() => {
        setEvmSigner(null);
        if(walletProvider==null || !isConnected) return;
        let cancelled = false;
        const browserProvider = new BrowserProvider(walletProvider as any);
        browserProvider.getSigner().then(signer => {
            if(cancelled) return;
            setEvmSigner(new EVMBrowserSigner(signer, signer.address));
        });
        return () => {
            cancelled = true;
        }
    }, [walletProvider, isConnected]);

    // const [shouldOpenWalletModal, setShouldOpenWalletModal] = useState(false);
    //
    // useEffect(() => {
    //     if(shouldOpenWalletModal && openConnectModal!=null) {
    //         openConnectModal();
    //         setShouldOpenWalletModal(false);
    //     }
    // }, [shouldOpenWalletModal, openConnectModal]);
    //
    // const changeWallet = useCallback(() => {
    //     disconnect();
    //     setShouldOpenWalletModal(true);
    // }, [disconnect]);

    // useMemo(() => {
    //     console.log("useEVMWalletData: useCallback(): connect function: ", openConnectModal);
    // }, [openConnectModal]);
    //

    const connect = useCallback(() => {
        open({ view: "Connect", namespace: "eip155" });
    }, [open]);

    return useMemo(() => {
        if(!FEConstants.allowedChains.has("CITREA")) return [null];
        return [{
            chain: {
                name: "Citrea",
                icon: "/icons/chains/CITREA.svg",
            },
            wallet: evmSigner==null ? null : {
                name: walletInfo?.name,
                icon: walletInfo?.icon,
                instance: evmSigner,
                address: evmSigner.getAddress()
            },
            id: "CITREA",
            disconnect: () => disconnect(),
            connect: connect,
            changeWallet: () => {
                disconnect().then(() => {
                    connect();
                });
            },
            swapperOptions: {
                rpcUrl: FEConstants.citreaRpc,
                chainType: FEConstants.citreaChainType
            }
        }]
    }, [evmSigner, connect, disconnect, walletInfo]);
}