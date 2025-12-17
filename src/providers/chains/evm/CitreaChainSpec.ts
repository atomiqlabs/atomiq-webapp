import {ChainsConfig} from "../../../data/ChainsConfig";

export const citreaChainId = ChainsConfig.CITREA?.chainType==="TESTNET4"
  ? 5115
  : 4114;

//Testnet
const citreaTestnetBlockscout = {
  name: "Blockscout - Citrea Testnet",
  url: "https://explorer.testnet.citrea.xyz/"
};

export const citreaTestnetChain = {
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

