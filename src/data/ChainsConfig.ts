import {BitcoinNetwork, MempoolApi, MempoolBitcoinRpc} from "@atomiqlabs/sdk";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import {constants} from "starknet";
import {RpcProviderWithRetries, WebSocketChannelWithRetries} from "@atomiqlabs/chain-starknet";
import {JsonRpcProviderWithRetries, WebSocketProviderWithRetries} from "@atomiqlabs/chain-evm";
import {Connection} from "@solana/web3.js";
import {SolanaFees} from "@atomiqlabs/chain-solana";

const mempoolUrls = {
  MAINNET: [
    'https://mempool.space/api/',
    'https://mempool.fra.mempool.space/api/',
    'https://mempool.va1.mempool.space/api/',
    'https://mempool.tk7.mempool.space/api/',
  ],
  TESTNET: [
    'https://mempool.space/testnet/api/',
    'https://mempool.fra.mempool.space/testnet/api/',
    'https://mempool.va1.mempool.space/testnet/api/',
    'https://mempool.tk7.mempool.space/testnet/api/',
  ],
  TESTNET4: [
    'https://mempool.space/testnet4/api/',
    'https://mempool.fra.mempool.space/testnet4/api/',
    'https://mempool.va1.mempool.space/testnet4/api/',
    'https://mempool.tk7.mempool.space/testnet4/api/',
  ]
};

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

const mempoolApi = new MempoolApi(mempoolUrls[import.meta.env.VITE_BITCOIN_NETWORK]);

const solanaRpc = import.meta.env.VITE_SOLANA_RPC_URL
  ? new Connection(import.meta.env.VITE_SOLANA_RPC_URL, {
    fetch: fetchWithTimeout,
    commitment: 'confirmed'
  }) : undefined;

export const ChainsConfig = {
  BITCOIN: {
    blockExplorer: import.meta.env.VITE_BTC_BLOCK_EXPLORER,
    network: import.meta.env.VITE_BITCOIN_NETWORK === 'TESTNET'
      ? BitcoinNetwork.TESTNET
      : import.meta.env.VITE_BITCOIN_NETWORK === 'TESTNET4'
        ? BitcoinNetwork.TESTNET4
        : BitcoinNetwork.MAINNET,
    mempoolApi,
    rpc: new MempoolBitcoinRpc(mempoolApi)
  },
  LIGHTNING: {},
  SOLANA: import.meta.env.VITE_SOLANA_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_SOL_BLOCK_EXPLORER,
      network: import.meta.env.VITE_SOLANA_NETWORK === 'MAINNET'
        ? WalletAdapterNetwork.Mainnet
        : WalletAdapterNetwork.Devnet,
      assetBalances: {
        'So11111111111111111111111111111111111111112': {
          optimal: 4000000n,
          minimum: 3000000n,
        }
      },
      rpcUrl: solanaRpc,
      retryPolicy: {
        transactionResendInterval: 3000,
      },
      fees: new SolanaFees(
        solanaRpc,
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
      )
    } : undefined,
  STARKNET: import.meta.env.VITE_STARKNET_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_STARKNET_BLOCK_EXPLORER,
      assetBalances: {
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7': {
          optimal: 150000000000000n,
          minimum: 50000000000000n,
        },
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d': {
          optimal: 1000000000000000000n,
          minimum: 500000000000000000n,
        },
      },
      rpcUrl: new RpcProviderWithRetries({nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL}),
      wsUrl: import.meta.env.VITE_STARKNET_WS_URL==null
        ? null
        : new WebSocketChannelWithRetries({
          nodeUrl: import.meta.env.VITE_STARKNET_WS_URL,
          reconnectOptions: {retries: Infinity, delay: 5000}
        }),
      chainId: import.meta.env.VITE_STARKNET_NETWORK === 'MAIN'
        ? constants.StarknetChainId.SN_MAIN
        : constants.StarknetChainId.SN_SEPOLIA,
    } : undefined,
  CITREA: import.meta.env.VITE_CITREA_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_CITREA_BLOCK_EXPLORER,
      assetBalances: {
        '0x0000000000000000000000000000000000000000': {
          optimal: 1000_0000000000n,
          minimum: 500_0000000000n
        }
      },
      rpcUrl: import.meta.env.VITE_CITREA_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_CITREA_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_CITREA_RPC_URL),
      chainType: import.meta.env.VITE_CITREA_NETWORK,
    } : undefined,
  BOTANIX: import.meta.env.VITE_BOTANIX_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_BOTANIX_BLOCK_EXPLORER,
      assetBalances: {
        '0x0000000000000000000000000000000000000000': {
          optimal: 500_0000000000n,
          minimum: 200_0000000000n
        }
      },
      rpcUrl: import.meta.env.VITE_BOTANIX_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_BOTANIX_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_BOTANIX_RPC_URL),
      chainType: import.meta.env.VITE_BOTANIX_NETWORK,
    } : undefined,
  ALPEN: import.meta.env.VITE_ALPEN_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_ALPEN_BLOCK_EXPLORER,
      assetBalances: {
        '0x0000000000000000000000000000000000000000': {
          optimal: 500_0000000000n,
          minimum: 200_0000000000n
        }
      },
      rpcUrl: import.meta.env.VITE_ALPEN_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_ALPEN_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_ALPEN_RPC_URL),
      chainType: import.meta.env.VITE_ALPEN_NETWORK,
    } : undefined,
  GOAT: import.meta.env.VITE_GOAT_RPC_URL
    ? {
      blockExplorer: import.meta.env.VITE_GOAT_BLOCK_EXPLORER,
      assetBalances: {
        '0x0000000000000000000000000000000000000000': {
          optimal: 500_0000000000n,
          minimum: 200_0000000000n
        }
      },
      rpcUrl: import.meta.env.VITE_GOAT_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_GOAT_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_GOAT_RPC_URL),
      chainType: import.meta.env.VITE_GOAT_NETWORK,
    } : undefined
} as const;
