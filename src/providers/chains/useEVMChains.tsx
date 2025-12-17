import {useCallback, useEffect, useMemo, useState} from "react";

import * as React from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {EVMBrowserSigner, EVMSigner} from "@atomiqlabs/chain-evm";
import {BrowserProvider} from "ethers";
import {Chain} from "../ChainsProvider";

import { createConfig, useAccount, useConnectors, useDisconnect, WagmiProvider} from "wagmi";
import { walletConnect } from 'wagmi/connectors';
import {citreaChainId, citreaTestnetChain} from "./evm/CitreaChainSpec";
import {botanixChainId, botanixTestnetChain} from "./evm/BotanixChainSpec";
import {ChainsConfig} from "../../data/ChainsConfig";

//TODO: Important to add new chain here!!!
const chains = [
  ChainsConfig.CITREA ? [citreaTestnetChain] : undefined,
  ChainsConfig.BOTANIX ? [botanixTestnetChain] : undefined
].flat().filter(val => val !== undefined);

const config = (createConfig as any)({
  chains,
  multiInjectedProviderDiscovery: true,
  connectors: [
    walletConnect({
      projectId: '2a38c0968b372694c0b2827a6e05b1f5',
      showQrModal: true
    })
  ],
  ssr: false
});
const queryClient = new QueryClient();

export function EVMWalletWrapper(props: {
  children: any
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function useEVMChain(enabled: boolean, chainId: number) {
  const { disconnect } = useDisconnect();
  const {connector, isConnected} = useAccount();

  const connectors = useConnectors();

  const [evmSigner, setEvmSigner] = useState<EVMSigner>();
  useEffect(() => {
    setEvmSigner(null);
    if(connector==null || connector.getProvider==null || !isConnected) return;
    let cancelled = false;
    connector.getProvider({chainId}).then(provider => {
      if(cancelled) return;
      return new BrowserProvider(provider as any).getSigner();
    }).then(signer => {
      if(cancelled) return;
      setEvmSigner(new EVMBrowserSigner(signer, signer.address));
    });
    return () => {
      cancelled = true;
    }
  }, [connector, isConnected, chainId]);

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

  const connectWallet = useCallback(async (walletName: string) => {
    const foundConnector = connectors.find(val => val.name===walletName);
    const result = await foundConnector.connect({chainId});
  }, [connectors, chainId]);

  return useMemo(() => {
    if(!enabled) return null;

    return {
      wallet: evmSigner==null ? null : {
        name: connector?.name,
        icon,
        instance: evmSigner,
        address: evmSigner.getAddress()
      },
      installedWallets: connectors.map(c => ({
        name: c.name,
        icon: c.icon,
        isConnected: c.name === connector?.name,
      })),
      nonInstalledWallets: [],
      _disconnect: () => disconnect(),
      _connectWallet: connectWallet,
      hasWallets: connectors.length>0
    };
  }, [evmSigner, connectors, connectWallet, connector, disconnect, icon]);
}

export function useCitreaChain(enabled: boolean): Chain<EVMSigner> {
  const common = useEVMChain(enabled, citreaChainId);

  return useMemo(() => {
    if(!enabled) return null;
    return {
      ...common,
      chain: {
        name: "Citrea",
        icon: "/icons/chains/CITREA.svg",
      },
      chainId: "CITREA"
    };
  }, [common]);
}

export function useBotanixChain(enabled: boolean): Chain<EVMSigner> {
  const common = useEVMChain(enabled, botanixChainId);

  return useMemo(() => {
    if(!enabled) return null;
    return {
      ...common,
      chain: {
        name: "Botanix",
        icon: "/icons/chains/BOTANIX.svg",
      },
      chainId: "BOTANIX"
    };
  }, [common]);
}
