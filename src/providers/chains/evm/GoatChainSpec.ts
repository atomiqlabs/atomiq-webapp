import {ChainsConfig} from "../../../data/ChainsConfig";

//Testnet
const goatTestnetBlockscout = {
  name: "Routescan - Goat Testnet3",
  url: "https://explorer.testnet3.goat.network/"
};

const goatTestnetChain = {
  blockExplorers: {
    "Routescan": goatTestnetBlockscout,
    default: goatTestnetBlockscout
  },
  blockTime: 3500,
  id: 48816,
  name: "GOAT Testnet3",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18
  },
  rpcUrls: {
    "GOAT public": { http: ["https://rpc.testnet3.goat.network"] },
    default: { http: ["https://rpc.testnet3.goat.network"] }
  },
  testnet: true
};

export const goatChain = ChainsConfig.GOAT?.chainType==='MAINNET'
  ? undefined
  : goatTestnetChain;
export const goatChainId = ChainsConfig.GOAT?.chainType==='MAINNET'
  ? undefined
  : 48816;
