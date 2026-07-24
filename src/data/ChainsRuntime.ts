import {MempoolApi, MempoolBitcoinRpc} from "@atomiqlabs/sdk";
import {RpcProviderWithRetries, WebSocketChannelWithRetries} from "@atomiqlabs/chain-starknet";
import {JsonRpcProviderWithRetries, WebSocketProviderWithRetries} from "@atomiqlabs/chain-evm";
import {Connection} from "@solana/web3.js";
import {SolanaFees} from "@atomiqlabs/chain-solana";
import {ChainsConfig} from "./ChainsConfig";

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

const mempoolApi = new MempoolApi(mempoolUrls[import.meta.env.VITE_BITCOIN_NETWORK]);

const solanaRpc = import.meta.env.VITE_SOLANA_RPC_URL
  ? new Connection(import.meta.env.VITE_SOLANA_RPC_URL, {
    fetch: fetchWithTimeout,
    commitment: 'confirmed'
  }) : undefined;

export const ChainsRuntime = {
  ...ChainsConfig,
  BITCOIN: {
    ...ChainsConfig.BITCOIN,
    mempoolApi,
    rpc: new MempoolBitcoinRpc(mempoolApi)
  },
  SOLANA: ChainsConfig.SOLANA == null
    ? undefined
    : {
      ...ChainsConfig.SOLANA,
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
    },
  STARKNET: import.meta.env.VITE_STARKNET_RPC_URL
    ? {
      ...ChainsConfig.STARKNET!,
      rpcUrl: new RpcProviderWithRetries({nodeUrl: import.meta.env.VITE_STARKNET_RPC_URL}),
      wsUrl: import.meta.env.VITE_STARKNET_WS_URL==null
        ? null
        : new WebSocketChannelWithRetries({
          nodeUrl: import.meta.env.VITE_STARKNET_WS_URL,
          reconnectOptions: {retries: Infinity, delay: 5000}
        }),
    } : undefined,
  CITREA: import.meta.env.VITE_CITREA_RPC_URL
    ? {
      ...ChainsConfig.CITREA!,
      rpcUrl: import.meta.env.VITE_CITREA_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_CITREA_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_CITREA_RPC_URL),
    } : undefined,
  BOTANIX: import.meta.env.VITE_BOTANIX_RPC_URL
    ? {
      ...ChainsConfig.BOTANIX!,
      rpcUrl: import.meta.env.VITE_BOTANIX_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_BOTANIX_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_BOTANIX_RPC_URL),
    } : undefined,
  ALPEN: import.meta.env.VITE_ALPEN_RPC_URL
    ? {
      ...ChainsConfig.ALPEN!,
      rpcUrl: import.meta.env.VITE_ALPEN_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_ALPEN_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_ALPEN_RPC_URL),
    } : undefined,
  GOAT: import.meta.env.VITE_GOAT_RPC_URL
    ? {
      ...ChainsConfig.GOAT!,
      rpcUrl: import.meta.env.VITE_GOAT_RPC_URL.startsWith("ws")
        ? new WebSocketProviderWithRetries(import.meta.env.VITE_GOAT_RPC_URL)
        : new JsonRpcProviderWithRetries(import.meta.env.VITE_GOAT_RPC_URL),
    } : undefined
} as const;
