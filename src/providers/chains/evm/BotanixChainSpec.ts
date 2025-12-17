import {ChainsConfig} from "../../../data/ChainsConfig";

//Testnet
const botanixTestnetBlockscout = {
  name: "Routescan - Botanix Testnet",
  url: "https://testnet.botanixscan.io/"
};

const botanixTestnetChain = {
  blockExplorers: {
    "Routescan": botanixTestnetBlockscout,
    default: botanixTestnetBlockscout
  },
  blockTime: 5 * 1000,
  id: 3636,
  name: "Botanix Testnet",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18
  },
  rpcUrls: {
    "Botanix public": { http: ["https://node.botanixlabs.dev"] },
    default: { http: ["https://node.botanixlabs.dev"] }
  },
  testnet: true
};

//Mainnet
const botanixMainnetRoutescan = {
  name: "Routescan - Botanix Mainnet",
  url: "https://botanixscan.io/"
};

const botanixMainnetChain = {
  blockExplorers: {
    "Routescan": botanixMainnetRoutescan,
    default: botanixMainnetRoutescan
  },
  blockTime: 5*1000,
  id: 3637,
  name: "Botanix",
  nativeCurrency: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 18
  },
  rpcUrls: {
    "Botanix public": {http: ["https://rpc.botanixlabs.com"]},
    default: {http: ["https://rpc.botanixlabs.com"]}
  },
  testnet: false
};

export const botanixChainId = ChainsConfig.BOTANIX?.chainType==='TESTNET'
  ? 3636
  : 3637;
export const botanixChain = ChainsConfig.BOTANIX?.chainType==='TESTNET'
  ? botanixTestnetChain
  : botanixMainnetChain;
