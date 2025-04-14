import BigNumber from "bignumber.js";
import {SCToken, toHumanReadableString, Token} from "@atomiqlabs/sdk";
import {FEConstants, Tokens} from "../FEConstants";

type TokensType = typeof Tokens;
type TokenTickers = {
    [Chain in keyof TokensType]: keyof TokensType[Chain];
}[keyof TokensType];

export const TokenIcons: {
    [C in TokenTickers]: string
} = {
    WBTC: "/icons/crypto/WBTC.png",
    USDC: "/icons/crypto/USDC.svg",
    USDT: null,
    SOL: "/icons/crypto/SOL.svg",
    BONK: "/icons/crypto/BONK.png",
    BTC: "/icons/crypto/BTC.svg",
    BTCLN: "/icons/crypto/BTC.svg",
    ETH: "/icons/crypto/ETH.png",
    STRK: "/icons/crypto/STRK.png"
};

export const bitcoinTokenArray = [
    Tokens.BITCOIN.BTC,
    Tokens.BITCOIN.BTCLN
];

export const smartChainTokenArray: SCToken[] = [];

if(FEConstants.allowedChains.has("SOLANA")) {
    smartChainTokenArray.push(Tokens.SOLANA.SOL);
    smartChainTokenArray.push(Tokens.SOLANA.USDC);
    smartChainTokenArray.push(Tokens.SOLANA.WBTC);
    smartChainTokenArray.push(Tokens.SOLANA.BONK);
}

if(FEConstants.allowedChains.has("STARKNET")) {
    smartChainTokenArray.push(Tokens.STARKNET.WBTC);
    // smartChainTokenArray.push(Tokens.STARKNET.STRK);
    // smartChainTokenArray.push(Tokens.STARKNET.ETH);
}

// for(let chainId in Tokens) {
//     if(chainId==="BITCOIN") continue;
//     for(let ticker in Tokens[chainId]) {
//         smartChainTokenArray.push(Tokens[chainId][ticker]);
//     }
// }

export function toHumanReadable(amount: bigint, currencySpec: Token): BigNumber {
    if(amount==null) return null;
    return new BigNumber(toHumanReadableString(amount, currencySpec));
}

export function fromHumanReadable(amount: BigNumber, currencySpec: Token): bigint {
    return BigInt(amount.multipliedBy(new BigNumber(10).pow(new BigNumber(currencySpec.decimals))).toFixed(0));
}
