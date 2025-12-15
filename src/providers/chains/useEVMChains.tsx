import {useCallback, useEffect, useMemo, useState} from "react";

import * as React from "react";
import { FEConstants } from "../../FEConstants";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {EVMBrowserSigner, EVMSigner} from "@atomiqlabs/chain-evm";
import {BrowserProvider} from "ethers";
import {Chain} from "../ChainsProvider";

import {createConfig, useAccount, useConnectors, useDisconnect, useWalletClient, WagmiProvider} from "wagmi";
import { metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';

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

const chains = [citreaTestnetChain];

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

export function useCitreaChain(enabled: boolean): Chain<EVMSigner> {
  const { disconnect } = useDisconnect();
  const {connector, isConnected} = useAccount();

  const connectors = useConnectors();

  const [evmSigner, setEvmSigner] = useState<EVMSigner>();
  useEffect(() => {
    setEvmSigner(null);
    if(connector==null || connector.getProvider==null || !isConnected) return;
    let cancelled = false;
    connector.getProvider({chainId: citreaTestnetChain.id}).then(provider => {
      if(cancelled) return;
      return new BrowserProvider(provider as any).getSigner();
    }).then(signer => {
      if(cancelled) return;
      setEvmSigner(new EVMBrowserSigner(signer, signer.address));
    });
    return () => {
      cancelled = true;
    }
  }, [connector, isConnected]);

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
    const result = await foundConnector.connect({
      chainId: citreaTestnetChain.id
    });
    console.log("useEVMChain(): Citrea wallet result: ", result);
  }, [connectors]);

  return useMemo(() => {
    if(!enabled) return null;

    return {
      chain: {
        name: "Citrea",
        icon: "/icons/chains/CITREA.svg",
      },
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
      chainId: "CITREA",
      _disconnect: () => disconnect(),
      _connectWallet: connectWallet,
      swapperOptions: {
        rpcUrl: FEConstants.citreaRpc,
        chainType: FEConstants.citreaChainType
      },
      hasWallets: connectors.length>0
    };
  }, [evmSigner, connectors, connectWallet, connector, disconnect, icon]);
}