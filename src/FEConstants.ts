import BigNumber from "bignumber.js";
import {PublicKey} from "@solana/web3.js";
import {WalletAdapterNetwork} from "@solana/wallet-adapter-base";
import * as BN from "bn.js";

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

export const FEConstants = {
    // expirySecondsBTCLNtoSol: 1*86400, //1 days
    // expirySecondsSoltoBTCLN: 3*86400, //3 days
    // confirmationsSoltoBTC: 3,
    // confirmationTargetSoltoBTC: 3,
    // url: "https://node3.gethopa.com",
    // customPorts: {
    //     [SwapType.BTCLN_TO_SOL]: 34000,
    //     [SwapType.SOL_TO_BTCLN]: 34001,
    //     [SwapType.BTC_TO_SOL]: 34002,
    //     [SwapType.SOL_TO_BTC]: 34003,
    // },
    // url: "http://localhost:4000",
    // customPorts: null,
    btcBlockExplorer,
    blockExplorers: {
        SOLANA: solBlockExplorer
    },
    scBalances: {
        SOLANA: {
            optimal: new BN(1000000)
        }
    },
    statsUrl,
    solanaChain: chain==="MAINNET" ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet,
    rpcUrl: solanaRpcUrl,
    chain,
    // wbtcToken: new PublicKey(SolanaChains[chain].tokens.WBTC),
    // usdcToken: new PublicKey(SolanaChains[chain].tokens.USDC),
    // usdtToken: new PublicKey(SolanaChains[chain].tokens.USDT),
    // wsolToken: new PublicKey(SolanaChains[chain].tokens.WSOL),
    // bonkToken: new PublicKey(SolanaChains[chain].tokens.BONK),
    // tokenData: {
    //     [SolanaChains[chain].tokens.WBTC]: {
    //         decimals: 8,
    //         symbol: "WBTC"
    //     },
    //     [SolanaChains[chain].tokens.USDC]: {
    //         decimals: 6,
    //         symbol: "USDC"
    //     },
    //     [SolanaChains[chain].tokens.USDT]: {
    //         decimals: 6,
    //         symbol: "USDT"
    //     },
    //     [SolanaChains[chain].tokens.WSOL]: {
    //         decimals: 9,
    //         symbol: "SOL"
    //     },
    //     [SolanaChains[chain].tokens.BONK]: {
    //         decimals: 5,
    //         symbol: "BONK"
    //     }
    // },
    url: null,
    satsPerBitcoin: new BigNumber(100000000),
    USDollar: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }),
    dappUrl,
    affiliateUrl
};