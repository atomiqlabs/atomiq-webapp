import {ChainsConfig} from "../../../data/ChainsConfig";

export const botanixChainId = ChainsConfig.BOTANIX?.chainType==='TESTNET'
  ? 3636
  : 3637;

const botanixTestnetBlockscout = {
  name: "Routescan - Botanix Testnet",
  url: "https://testnet.botanixscan.io/"
};

export const botanixTestnetChain = {
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
