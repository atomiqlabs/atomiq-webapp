import {BitcoinNetwork} from "@atomiqlabs/sdk";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";

// Starknet chain-id literals, inlined to avoid importing the heavy `starknet` package here.
// Verified against node_modules/starknet: encodeShortString('SN_MAIN') / encodeShortString('SN_SEPOLIA').
const SN_MAIN = '0x534e5f4d41494e';
const SN_SEPOLIA = '0x534e5f5345504f4c4941';

export const ChainsConfig = {
  BITCOIN: {
    blockExplorer: import.meta.env.VITE_BTC_BLOCK_EXPLORER,
    network: import.meta.env.VITE_BITCOIN_NETWORK === 'TESTNET'
      ? BitcoinNetwork.TESTNET
      : import.meta.env.VITE_BITCOIN_NETWORK === 'TESTNET4'
        ? BitcoinNetwork.TESTNET4
        : BitcoinNetwork.MAINNET,
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
          optimal: 10_000_000n,
          minimum: 3_000_000n,
        }
      },
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
          optimal: 10_000000000000000000n,
          minimum: 2_500000000000000000n,
        },
      },
      chainId: (import.meta.env.VITE_STARKNET_NETWORK === 'MAIN'
        ? SN_MAIN
        : SN_SEPOLIA) as typeof SN_MAIN | typeof SN_SEPOLIA,
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
      chainType: import.meta.env.VITE_CITREA_NETWORK,
      evmConfig: {
        maxLogsBlockRange: import.meta.env.VITE_CITREA_MAX_LOGS_BLOCK_RANGE==null ? undefined : parseInt(import.meta.env.VITE_CITREA_MAX_LOGS_BLOCK_RANGE),
        maxParallelLogRequests: import.meta.env.VITE_CITREA_MAX_PARALLEL_LOG_REQUESTS==null ? undefined : parseInt(import.meta.env.VITE_CITREA_MAX_PARALLEL_LOG_REQUESTS)
      }
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
      chainType: import.meta.env.VITE_BOTANIX_NETWORK,
      evmConfig: {
        maxLogsBlockRange: import.meta.env.VITE_BOTANIX_MAX_LOGS_BLOCK_RANGE==null ? undefined : parseInt(import.meta.env.VITE_BOTANIX_MAX_LOGS_BLOCK_RANGE),
        maxParallelLogRequests: import.meta.env.VITE_BOTANIX_MAX_PARALLEL_LOG_REQUESTS==null ? undefined : parseInt(import.meta.env.VITE_BOTANIX_MAX_PARALLEL_LOG_REQUESTS)
      }
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
      chainType: import.meta.env.VITE_ALPEN_NETWORK,
      evmConfig: {
        maxLogsBlockRange: import.meta.env.VITE_ALPEN_MAX_LOGS_BLOCK_RANGE==null ? undefined : parseInt(import.meta.env.VITE_ALPEN_MAX_LOGS_BLOCK_RANGE),
        maxParallelLogRequests: import.meta.env.VITE_ALPEN_MAX_PARALLEL_LOG_REQUESTS==null ? undefined : parseInt(import.meta.env.VITE_ALPEN_MAX_PARALLEL_LOG_REQUESTS)
      }
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
      chainType: import.meta.env.VITE_GOAT_NETWORK,
      evmConfig: {
        maxLogsBlockRange: import.meta.env.VITE_GOAT_MAX_LOGS_BLOCK_RANGE==null ? undefined : parseInt(import.meta.env.VITE_GOAT_MAX_LOGS_BLOCK_RANGE),
        maxParallelLogRequests: import.meta.env.VITE_GOAT_MAX_PARALLEL_LOG_REQUESTS==null ? undefined : parseInt(import.meta.env.VITE_GOAT_MAX_PARALLEL_LOG_REQUESTS)
      }
    } : undefined
} as const;
