import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Chain } from '../ChainsProvider';
import { SolanaFees, SolanaSigner } from '@atomiqlabs/chain-solana';
import { useCallback, useMemo } from 'react';

import * as React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  TorusWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { FEConstants } from '../../FEConstants';

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network: FEConstants.solanaChain }),
  new TorusWalletAdapter(),
  new LedgerWalletAdapter(),
];

const jitoPubkey = 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL';
const jitoEndpoint = 'https://mainnet.block-engine.jito.wtf/api/v1/transactions';

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit) => {
  if (init == null) init = {};

  let timedOut = false;
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    abortController.abort('Timed out');
  }, 15000);
  let originalSignal: AbortSignal;
  if (init.signal != null) {
    originalSignal = init.signal;
    init.signal.addEventListener('abort', (reason) => {
      clearTimeout(timeoutHandle);
      abortController.abort(reason);
    });
  }
  init.signal = abortController.signal;
  try {
    return await fetch(input, init);
  } catch (e) {
    console.error('SolanaWalletProvider: fetchWithTimeout(' + typeof e + '): ', e);
    if (
      e.name === 'AbortError' &&
      (originalSignal == null || !originalSignal.aborted) &&
      timedOut
    ) {
      throw new Error('Network request timed out');
    } else {
      throw e instanceof Error ? e : new Error(e);
    }
  }
};

export function SolanaWalletWrapper(props: { children: any }) {
  return (
    <ConnectionProvider
      endpoint={FEConstants.solanaRpcUrl ?? 'http://example.com/'}
      config={{ fetch: fetchWithTimeout, commitment: 'confirmed' }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        {props.children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useSolanaChain(enabled: boolean): Chain<SolanaSigner> {
  const { wallet, disconnect, wallets: availableWallets, select } = useWallet();
  const solanaWallet = useAnchorWallet();
  const { connection } = useConnection();

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
    if (!enabled) return null;

    const solanaFees = new SolanaFees(
      connection,
      1000000,
      2,
      100,
      'auto',
      'high',
      () => 50000n
      //, {
      //    address: jitoPubkey,
      //    endpoint: jitoEndpoint
      //}
    );

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
      swapperOptions: {
        rpcUrl: connection,
        retryPolicy: {
          transactionResendInterval: 3000,
        },
        fees: solanaFees,
      },
      hasWallets: availableWallets.length > 0,
    };
  }, [wallet, solanaSigner, disconnect, connectWallet, connection, availableWallets]);
}
