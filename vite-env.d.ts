/// <reference types="vite/client" />

interface ImportMetaEnv {
    // --- MAINNET / active ---
    readonly VITE_UNISAT_API_URL: string;
    readonly VITE_UNISAT_API_KEY: string;

    readonly VITE_BITCOIN_NETWORK: 'MAINNET' | 'TESTNET' | 'TESTNET4';
    readonly VITE_BTC_BLOCK_EXPLORER: string;

    //Smart chains
    readonly VITE_SOLANA_RPC_URL?: string;
    readonly VITE_SOLANA_NETWORK?: 'MAINNET' | 'DEVNET';
    readonly VITE_SOL_BLOCK_EXPLORER?: string;

    readonly VITE_STARKNET_RPC_URL?: string;
    readonly VITE_STARKNET_WS_URL?: string;
    readonly VITE_STARKNET_NETWORK?: 'MAIN' | 'SEPOLIA';
    readonly VITE_STARKNET_BLOCK_EXPLORER?: string;

    readonly VITE_BOTANIX_RPC_URL?: string;
    readonly VITE_BOTANIX_NETWORK?: 'TESTNET' | 'MAINNET';
    readonly VITE_BOTANIX_BLOCK_EXPLORER?: string;

    readonly VITE_GOAT_RPC_URL?: string;
    readonly VITE_GOAT_NETWORK?: 'TESTNET' | 'MAINNET';
    readonly VITE_GOAT_BLOCK_EXPLORER?: string;

    readonly VITE_ALPEN_RPC_URL?: string;
    readonly VITE_ALPEN_NETWORK?: 'TESTNET' | 'MAINNET';
    readonly VITE_ALPEN_BLOCK_EXPLORER?: string;

    readonly VITE_CITREA_RPC_URL?: string;
    readonly VITE_CITREA_NETWORK?: 'TESTNET4' | 'MAINNET';
    readonly VITE_CITREA_BLOCK_EXPLORER?: string;

    //Optional
    readonly VITE_STATS_URL?: string;
    readonly VITE_DEFAULT_LP?: string;
    readonly VITE_TRUSTED_GAS_SWAP?: string;
    readonly VITE_OVERRIDE_BITCOIN_FEE?: string;

    //Affiliate
    readonly VITE_DAPP_URL?: string;
    readonly VITE_AFFILIATE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
