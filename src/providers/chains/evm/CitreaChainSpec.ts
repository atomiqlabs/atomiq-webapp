import {ChainsConfig} from "../../../data/ChainsConfig";

//Testnet
const citreaTestnetBlockscout = {
  name: "Blockscout - Citrea Testnet",
  url: "https://explorer.testnet.citrea.xyz/"
};

const citreaTestnetChain = {
  blockExplorers: {
    "Blockscout": citreaTestnetBlockscout,
    default: citreaTestnetBlockscout
  },
  blockTime: 2*1000,
  id: 5115,
  name: "Citrea Testnet",
  nativeCurrency: {
    name: "Citrea BTC",
    symbol: "cBTC",
    decimals: 18
  },
  rpcUrls: {
    "Citrea public": {http: ["https://rpc.testnet.citrea.xyz"]},
    default: {http: ["https://rpc.testnet.citrea.xyz"]}
  },
  testnet: true
};

//Mainnet
const citreaMainnetBlockscout = {
  name: "Blockscout - Citrea Mainnet",
  url: "https://explorer.mainnet.citrea.xyz/"
};

const citreaMainnetChain = {
  blockExplorers: {
    "Blockscout": citreaMainnetBlockscout,
    default: citreaMainnetBlockscout
  },
  blockTime: 2*1000,
  id: 4114,
  name: "Citrea Testnet",
  nativeCurrency: {
    name: "Citrea BTC",
    symbol: "cBTC",
    decimals: 18
  },
  rpcUrls: {
    "Citrea public": {http: ["https://rpc.mainnet.citrea.xyz"]},
    default: {http: ["https://rpc.mainnet.citrea.xyz"]}
  },
  testnet: true
};

export const citreaChainId = ChainsConfig.CITREA?.chainType==="TESTNET4"
  ? 5115
  : 4114;
export const citreaChain = ChainsConfig.CITREA?.chainType==="TESTNET4"
  ? citreaTestnetChain
  : citreaMainnetChain;