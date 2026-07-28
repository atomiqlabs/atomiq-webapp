// Type-only: `typeof Tokens` needs no runtime value, and a value import here would
// drag the whole SDK Factory into the eager bundle (see scripts/entry-audit.mjs).
import type {Tokens} from "./SwapperFactory";

type TokensType = typeof Tokens;
type TokenTickers = {
    [Chain in keyof TokensType]: keyof TokensType[Chain];
}[keyof TokensType];
export const TokenIconsChainSpecific: {
    [chainId: string]: {
        [C in TokenTickers]?: string
    }
} = {
    BOTANIX: {
        BTC: "/icons/crypto/BBTC.svg"
    }
};
export const TokenIcons: {
    [C in TokenTickers]: string;
} = {
    WBTC: '/icons/crypto/WBTC.png',
    USDC: '/icons/crypto/USDC.svg',
    USDT: null,
    SOL: '/icons/crypto/SOL.svg',
    BONK: '/icons/crypto/BONK.png',
    BTC: '/icons/crypto/BTC.svg',
    BTCLN: '/icons/crypto/BTC.svg',
    ETH: '/icons/crypto/ETH.svg',
    STRK: '/icons/crypto/STRK.png',
    _TESTNET_WBTC_VESU: '/icons/crypto/WBTC.png',
    TBTC: null,
    CBTC: '/icons/crypto/BTC.svg',
    PBTC: '/icons/crypto/BTC.svg',
    _PBTC_DEV: '/icons/crypto/BTC.svg',
    strkBTC: '/icons/crypto/strkBTC.png',
    _TESTNET_strkBTC: '/icons/crypto/strkBTC.png'
};
