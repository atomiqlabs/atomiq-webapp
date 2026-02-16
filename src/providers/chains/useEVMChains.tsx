import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import * as React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {EVMBrowserSigner, EVMSigner} from '@atomiqlabs/chain-evm';
import {BrowserProvider} from 'ethers';
import {Chain} from '../ChainsProvider';

import {Connector, createConfig, useAccount, useConnectors, useDisconnect, useSwitchChain, WagmiProvider} from 'wagmi';
import { walletConnect } from 'wagmi/connectors';
import {citreaChain, citreaChainId} from './evm/CitreaChainSpec';
import {botanixChain, botanixChainId} from './evm/BotanixChainSpec';
import {ChainsConfig} from '../../data/ChainsConfig';
import {alpenChain, alpenChainId} from './evm/AlpenChainSpec';
import {goatChain, goatChainId} from './evm/GoatChainSpec';
import {ChainSwitchingSigner} from "./evm/ChainSwitchingSigner";

const BLOCKED_CONNECTORS = [
  "app.phantom"
];

const overrideIcons: {[walletName: string]: string} = {
  WalletConnect: 'wallets/evm/WalletConnect.svg'
};

const overrideStatusText: {[walletName: string]: string} = {
  WalletConnect: 'QR code'
};

const installableWallets = [
  {
    name: 'MetaMask',
    icon: 'wallets/evm/MetaMask.svg',
    downloadLink: 'https://metamask.io/download'
  },
  {
    name: 'Rabby Wallet',
    icon: 'wallets/evm/Rabby.svg',
    downloadLink: 'https://rabby.io/'
  },
  {
    name: 'Binance Wallet',
    icon: 'wallets/evm/Binance.svg',
    downloadLink: 'https://www.binance.com/en/binancewallet'
  },
  {
    name: 'Coinbase Wallet',
    icon: 'wallets/evm/Coinbase.svg',
    downloadLink: 'https://www.coinbase.com/wallet/downloads'
  }
];

//TODO: Important to add new chain here!!!
const chains = [
  ChainsConfig.CITREA ? citreaChain : undefined,
  ChainsConfig.BOTANIX ? botanixChain : undefined,
  ChainsConfig.ALPEN ? alpenChain : undefined,
  ChainsConfig.GOAT ? goatChain : undefined,
].filter(val => val !== undefined);

const config = chains.length===0 ? undefined : (createConfig as any)({
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
  if(config==null) return props.children;
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

function useEVMChain(enabled: boolean, chainId: number) {
  if(config==null) return null;

  const { disconnect } = useDisconnect();
  const {connector, isConnected, chainId: connectedChainId} = useAccount();

  const connectedChainIdRef = useRef<number>();
  useMemo(() => connectedChainIdRef.current = connectedChainId, [connectedChainId]);
  const currentConnectorRef = useRef<Connector>();
  useMemo(() => currentConnectorRef.current = connector, [connector]);

  const _connectors = useConnectors();
  const connectors = useMemo(
    () => _connectors.filter(c => !BLOCKED_CONNECTORS.includes(c.id)),
    [_connectors]
  );

  const [evmSigner, setEvmSigner] = useState<EVMSigner>();
  useEffect(() => {
    setEvmSigner(null);
    if(connector==null || connector.getProvider==null || !isConnected) return;
    if(BLOCKED_CONNECTORS.includes(connector.id)) return;
    let cancelled = false;
    connector.getProvider({chainId}).then(provider => {
      if(cancelled) return;
      return new BrowserProvider(provider as any).getSigner();
    }).then(signer => {
      if(cancelled) return;
      const _signer = new ChainSwitchingSigner(
        signer,
        (chainId: number) => currentConnectorRef.current.switchChain({chainId}).then(() => {}),
        () => connectedChainIdRef.current
      );
      setEvmSigner(new EVMBrowserSigner(_signer, signer.address));
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
    if(typeof(icon)==='string') {
      setIcon(icon);
    } else if(typeof(icon)==='function') {
      const result = icon();
      if(typeof(result)==='string') {
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
    await disconnect();
    const foundConnector = connectors.find(val => val.name===walletName);
    const result = await foundConnector.connect({chainId});
  }, [connectors, chainId]);

  const installedWalletNames: Set<string> = useMemo(
    () => new Set(connectors.map(c => c.name)),
    [connectors]
  );

  const nonInstalledWallets = useMemo(() => {
    return installableWallets.filter(wallet => !installedWalletNames.has(wallet.name))
  }, [installedWalletNames]);

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
        icon: overrideIcons[c.name] ?? c.icon,
        isConnected: c.name === connector?.name,
        overrideInstalledStatusText: overrideStatusText[c.name]
      })),
      nonInstalledWallets,
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
        name: 'Citrea',
        icon: '/icons/chains/CITREA.svg',
      },
      chainId: 'CITREA'
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
        name: 'Botanix',
        icon: '/icons/chains/BOTANIX.svg',
      },
      chainId: 'BOTANIX'
    };
  }, [common]);
}

export function useAlpenChain(enabled: boolean): Chain<EVMSigner> {
  const common = useEVMChain(enabled, alpenChainId);

  return useMemo(() => {
    if(!enabled) return null;
    return {
      ...common,
      chain: {
        name: 'Alpen',
        icon: '/icons/chains/ALPEN.svg',
      },
      chainId: 'ALPEN'
    };
  }, [common]);
}

export function useGoatChain(enabled: boolean): Chain<EVMSigner> {
  const common = useEVMChain(enabled, goatChainId);

  return useMemo(() => {
    if(!enabled) return null;
    return {
      ...common,
      chain: {
        name: 'GOAT',
        icon: '/icons/chains/GOAT.svg',
      },
      chainId: 'GOAT'
    };
  }, [common]);
}
