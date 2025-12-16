import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Chain } from '../ChainsProvider';
import { SolanaFees, SolanaSigner } from '@atomiqlabs/chain-solana';
import { useCallback, useMemo } from 'react';

import * as React from 'react';
import { WalletProvider } from '@solana/wallet-adapter-react';
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  TorusWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {ChainsConfig} from "../../data/ChainsConfig";

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network: ChainsConfig.SOLANA?.network }),
  new TorusWalletAdapter(),
  new LedgerWalletAdapter(),
];

export function SolanaWalletWrapper(props: { children: any }) {
  return (
    <WalletProvider wallets={wallets} autoConnect>
      {props.children}
    </WalletProvider>
  );
}

export function useSolanaChain(enabled: boolean): Chain<SolanaSigner> {
  const { wallet, disconnect, wallets: availableWallets, select } = useWallet();
  const solanaWallet = useAnchorWallet();

  const solanaSigner = useMemo(
    () => (solanaWallet == null ? null : new SolanaSigner(solanaWallet)),
    [solanaWallet]
  );

  const connectWallet = useCallback(
    async (walletName: string) => {
      select(walletName as any);
    },
    [select]
  );

  return useMemo<Chain<SolanaSigner>>(() => {
    if (!enabled) return null;;

    return {
      chain: {
        name: 'Solana',
        icon: '/icons/chains/SOLANA.svg',
      },
      wallet:
        wallet == null
          ? null
          : {
              name: wallet.adapter?.name,
              icon: wallet.adapter?.icon,
              instance: solanaSigner,
              address: wallet.adapter?.publicKey?.toBase58(),
            },
      installedWallets: availableWallets
        .filter((w) => w.readyState === 'Installed')
        .map((w) => ({
          name: w.adapter.name,
          icon: w.adapter.icon,
          isConnected: w.adapter.name === wallet?.adapter?.name,
        })),
      nonInstalledWallets: availableWallets
        .filter((w) => w.readyState === 'Loadable' || w.readyState === 'NotDetected')
        .map((w) => ({
          name: w.adapter.name,
          icon: w.adapter.icon,
          downloadLink: w.adapter.url,
        })),
      chainId: 'SOLANA',
      _disconnect: disconnect,
      _connectWallet: connectWallet,
      hasWallets: availableWallets.length > 0,
    };
  }, [wallet, solanaSigner, disconnect, connectWallet, availableWallets]);
}
