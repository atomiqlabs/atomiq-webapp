import BigNumber from "bignumber.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import * as BN from "bn.js";
import { constants, RpcProvider } from "starknet";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
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
// const solanaRpcUrl: string = "https://api.devnet.solana.com";
// const chain: "DEVNET" | "MAINNET" = "DEVNET"; //DEVNET or MAINNET
// const btcBlockExplorer: string = "https://mempool.space/testnet/tx/";
console.log("SOLana chain: ", solanaChain);
console.log("SOLana RPC: ", solanaRpcUrl);
export const FEConstants = {
    btcBlockExplorer,
    blockExplorers: {
        SOLANA: solBlockExplorer,
        STARKNET: starknetBlockExplorer
    },
    scBalances: {
        SOLANA: {
            optimal: new BN(4000000)
        },
        STARKNET: {
            optimal: new BN(300000000000000)
        }
    },
    statsUrl,
    solanaChain: solanaChain === "MAINNET" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    solanaRpcUrl,
    starknetChainId: starknetChain == null ? null : (starknetChain === "MAIN" ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA),
    starknetRpc: new RpcProvider({ nodeUrl: starknetRpcUrl }),
    bitcoinNetwork: bitcoinNetwork === "TESTNET" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
    url: null,
    satsPerBitcoin: new BigNumber(100000000),
    USDollar: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }),
    dappUrl,
    affiliateUrl
};
