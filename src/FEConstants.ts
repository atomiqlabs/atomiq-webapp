import BigNumber from "bignumber.js";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import * as BN from "bn.js";
import {constants, RpcProvider} from "starknet";
import {BitcoinNetwork} from "@atomiqlabs/sdk";

const solanaRpcUrl: string = process.env.REACT_APP_SOLANA_RPC_URL;
const solanaChain: "DEVNET" | "MAINNET" = process.env.REACT_APP_SOLANA_NETWORK as ("DEVNET" | "MAINNET"); //DEVNET or MAINNET
const btcBlockExplorer: string = process.env.REACT_APP_BTC_BLOCK_EXPLORER;
const solBlockExplorer: string = process.env.REACT_APP_SOL_BLOCK_EXPLORER;
const statsUrl: string = process.env.REACT_APP_STATS_URL;
const dappUrl: string = process.env.REACT_APP_DAPP_URL;
const affiliateUrl: string = process.env.REACT_APP_AFFILIATE_URL;

const starknetRpcUrl: string = process.env.REACT_APP_STARKNET_RPC_URL;
const starknetChain: "SEPOLIA" | "MAIN" = process.env.REACT_APP_STARKNET_NETWORK as ("SEPOLIA" | "MAIN"); //SEPOLIA or MAIN
const starknetBlockExplorer: string = process.env.REACT_APP_STARKNET_BLOCK_EXPLORER;

const bitcoinNetwork: "TESTNET" | "MAINNET" = process.env.REACT_APP_BITCOIN_NETWORK as ("TESTNET" | "MAINNET"); //SEPOLIA or MAIN

export const FEConstants = {
    btcBlockExplorer,
    blockExplorers: {
        SOLANA: solBlockExplorer,
        STARKNET: starknetBlockExplorer
    },
    scBalances: {
        SOLANA: {
            optimal: {
                "So11111111111111111111111111111111111111112": new BN(4000000)
            }
        },
        STARKNET: {
            optimal: {
                "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7": new BN("150000000000000"),
                "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d": new BN("1000000000000000000")
            }
        }
    },
    allowedChains: new Set<string>([
        solanaRpcUrl!=null ? "SOLANA" : undefined,
        starknetRpcUrl!=null ? "STARKNET" : undefined
    ]),
    statsUrl,
    solanaChain: solanaChain==="MAINNET" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    solanaRpcUrl,
    starknetChainId: starknetChain==null ? null : (starknetChain==="MAIN" ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA),
    starknetRpc: starknetRpcUrl==null ? null : new RpcProvider({nodeUrl: starknetRpcUrl}),
    bitcoinNetwork: bitcoinNetwork==="TESTNET" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
    url: null,
    satsPerBitcoin: new BigNumber(100000000),
    USDollar: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }),
    dappUrl,
    affiliateUrl,
    trustedGasSwapLp: process.env.REACT_APP_TRUSTED_GAS_SWAP,
    defaultLp: process.env.REACT_APP_DEFAULT_LP
};