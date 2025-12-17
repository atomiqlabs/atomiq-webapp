import {ChainsConfig} from "../../../data/ChainsConfig";

//Testnet
const alpenTestnetBlockscout = {
  name: "Blockscout - Alpen Testnet",
  url: "https://explorer.testnet.alpenlabs.io/"
};

const alpenTestnetChain = {
  blockExplorers: {
    "Blockscout": alpenTestnetBlockscout,
    default: alpenTestnetBlockscout
  },
  blockTime: 5*1000,
  id: 2892,
  name: "Alpen Testnet",
  nativeCurrency: {
    name: "Signet BTC",
    symbol: "sBTC",
    decimals: 18
  },
  rpcUrls: {
    "Alpen public": {http: ["https://rpc.testnet.alpenlabs.io"]},
    default: {http: ["https://rpc.testnet.alpenlabs.io"]}
  },
  testnet: true
};

export const alpenChainId = ChainsConfig.ALPEN?.chainType==='TESTNET'
  ? 2892
  : undefined;
export const alpenChain = ChainsConfig.ALPEN?.chainType==='TESTNET'
  ? alpenTestnetChain
  : undefined;
