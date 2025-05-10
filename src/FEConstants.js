import BigNumber from "bignumber.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { constants, RpcProvider } from "starknet";
import { BitcoinNetwork, MempoolApi, SwapperFactory } from "@atomiqlabs/sdk";
import { SolanaInitializer } from "@atomiqlabs/chain-solana";
import { StarknetInitializer } from "@atomiqlabs/chain-starknet";
const solanaRpcUrl = process.env.REACT_APP_SOLANA_RPC_URL;
const solanaChain = process.env.REACT_APP_SOLANA_NETWORK; //DEVNET or MAINNET
const btcBlockExplorer = process.env.REACT_APP_BTC_BLOCK_EXPLORER;
const solBlockExplorer = process.env.REACT_APP_SOL_BLOCK_EXPLORER;
const statsUrl = process.env.REACT_APP_STATS_URL;
const dappUrl = process.env.REACT_APP_DAPP_URL;
const affiliateUrl = process.env.REACT_APP_AFFILIATE_URL;
const starknetRpcUrl = process.env.REACT_APP_STARKNET_RPC_URL;
const starknetChain = process.env.REACT_APP_STARKNET_NETWORK; //SEPOLIA or MAIN
const starknetBlockExplorer = process.env.REACT_APP_STARKNET_BLOCK_EXPLORER;
const bitcoinNetwork = process.env.REACT_APP_BITCOIN_NETWORK; //SEPOLIA or MAIN
const mempoolApi = new MempoolApi(bitcoinNetwork === "MAINNET" ?
    [
        "https://mempool.space/api/",
        "https://mempool.fra.mempool.space/api/",
        "https://mempool.va1.mempool.space/api/",
        "https://mempool.tk7.mempool.space/api/"
    ] :
    [
        "https://mempool.space/testnet/api/",
        "https://mempool.fra.mempool.space/testnet/api/",
        "https://mempool.va1.mempool.space/testnet/api/",
        "https://mempool.tk7.mempool.space/testnet/api/"
    ]);
export const Factory = new SwapperFactory([SolanaInitializer, StarknetInitializer]);
console.log("Factory: ", Factory);
export const Tokens = Factory.Tokens;
export const TokenResolver = Factory.TokenResolver;
export const FEConstants = {
    btcBlockExplorer,
    blockExplorers: {
        SOLANA: solBlockExplorer,
        STARKNET: starknetBlockExplorer
    },
    scBalances: {
        "SOLANA:So11111111111111111111111111111111111111112": {
            optimal: 4000000n,
            minimum: 3000000n
        },
        "STARKNET:0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": {
            optimal: 150000000000000n,
            minimum: 50000000000000n
        },
        "STARKNET:0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": {
            optimal: 1000000000000000000n,
            minimum: 500000000000000000n
        }
    },
    mempoolApi,
    allowedChains: new Set([
        solanaRpcUrl != null ? "SOLANA" : undefined,
        starknetRpcUrl != null ? "STARKNET" : undefined
    ]),
    statsUrl,
    solanaChain: solanaChain === "MAINNET" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    solanaRpcUrl,
    starknetChainId: starknetChain == null ? null : (starknetChain === "MAIN" ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA),
    starknetRpc: starknetRpcUrl == null ? null : new RpcProvider({ nodeUrl: starknetRpcUrl }),
    bitcoinNetwork: bitcoinNetwork === "TESTNET" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
    url: null,
    satsPerBitcoin: new BigNumber(100000000),
    USDollar: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }),
    dappUrl,
    affiliateUrl,
    trustedGasSwapLp: process.env.REACT_APP_TRUSTED_GAS_SWAP,
    defaultLp: process.env.REACT_APP_DEFAULT_LP?.split(",")
};
