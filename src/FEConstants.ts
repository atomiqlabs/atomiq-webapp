import BigNumber from "bignumber.js";
import {PublicKey} from "@solana/web3.js";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import * as BN from "bn.js";
import {MempoolApi} from "@atomiqlabs/sdk";

const solanaRpcUrl: string = process.env.REACT_APP_SOLANA_RPC_URL;
const chain: "DEVNET" | "MAINNET" = process.env.REACT_APP_SOLANA_NETWORK as ("DEVNET" | "MAINNET"); //DEVNET or MAINNET
const btcBlockExplorer: string = process.env.REACT_APP_BTC_BLOCK_EXPLORER;
const solBlockExplorer: string = process.env.REACT_APP_SOL_BLOCK_EXPLORER;
const statsUrl: string = process.env.REACT_APP_STATS_URL;
const dappUrl: string = process.env.REACT_APP_DAPP_URL;
const affiliateUrl: string = process.env.REACT_APP_AFFILIATE_URL;
// const solanaRpcUrl: string = "https://api.devnet.solana.com";
// const chain: "DEVNET" | "MAINNET" = "DEVNET"; //DEVNET or MAINNET
// const btcBlockExplorer: string = "https://mempool.space/testnet/tx/";

console.log("SOLana chain: ", chain);
console.log("SOLana RPC: ", solanaRpcUrl);

const mempoolApi = new MempoolApi(
    chain==="MAINNET" ?
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
        ]
);

export const FEConstants = {
    btcBlockExplorer,
    blockExplorers: {
        SOLANA: solBlockExplorer
    },
    scBalances: {
        SOLANA: {
            optimal: new BN(4000000)
        }
    },
    mempoolApi,
    statsUrl,
    solanaChain: chain==="MAINNET" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    rpcUrl: solanaRpcUrl,
    chain,
    url: null,
    satsPerBitcoin: new BigNumber(100000000),
    USDollar: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }),
    dappUrl,
    affiliateUrl
};