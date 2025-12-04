import BigNumber from "bignumber.js";
import {isBtcToken, isSCToken, SCToken, SwapType, toHumanReadableString, Token} from "@atomiqlabs/sdk";
import {FEConstants, TokenResolver, Tokens} from "../FEConstants";

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
    [C in TokenTickers]?: string
} = {
    WBTC: "/icons/crypto/WBTC.png",
    USDC: "/icons/crypto/USDC.svg",
    USDT: null,
    SOL: "/icons/crypto/SOL.svg",
    BONK: "/icons/crypto/BONK.png",
    BTC: "/icons/crypto/BTC.svg",
    BTCLN: "/icons/crypto/BTC.svg",
    ETH: "/icons/crypto/ETH.png",
    STRK: "/icons/crypto/STRK.png",
    CBTC: "/icons/crypto/BTC.svg",
    // BBTC: "/icons/crypto/BBTC.svg",
    // ABTC: "/icons/crypto/BTC.svg"
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

if(FEConstants.allowedChains.has("CITREA")) {
    smartChainTokenArray.push(Tokens.CITREA.CBTC);
    smartChainTokenArray.push(Tokens.CITREA.USDC);
}

if(FEConstants.allowedChains.has("BOTANIX")) {
    smartChainTokenArray.push(Tokens.BOTANIX.BTC);
}

if(FEConstants.allowedChains.has("ALPEN")) {
    smartChainTokenArray.push(Tokens.ALPEN.BTC);
}

if(FEConstants.allowedChains.has("GOAT")) {
    smartChainTokenArray.push(Tokens.GOAT.BTC);
}

if(FEConstants.allowedChains.has("STARKNET")) {
    smartChainTokenArray.push(Tokens.STARKNET.WBTC);
    smartChainTokenArray.push(Tokens.STARKNET.STRK);
    smartChainTokenArray.push(Tokens.STARKNET.ETH);
}

export const allTokens = [...bitcoinTokenArray, ...smartChainTokenArray];

export function toHumanReadable(amount: bigint, currencySpec: Token): BigNumber {
    if(amount==null) return null;
    return new BigNumber(toHumanReadableString(amount, currencySpec));
}

export function fromHumanReadable(amount: BigNumber, currencySpec: Token): bigint {
    return BigInt(amount.multipliedBy(new BigNumber(10).pow(new BigNumber(currencySpec.decimals))).toFixed(0));
}

export function includesToken(tokenList: Token[], token: Token): boolean {
    return tokenList.find(val => toTokenIdentifier(val)===toTokenIdentifier(token))!=null;
}

export function toTokenIdentifier(token: Token): string {
    if(token==null) return null;
    if(isBtcToken(token)) {
        return token.lightning ? "LIGHTNING" : "BITCOIN";
    } else if(isSCToken(token)) {
        return token.chainId+":"+token.address;
    }
}

export function fromTokenIdentifier(identifier: string): Token {
    if(identifier==null) return null;
    switch(identifier) {
        case "LIGHTNING":
            return Tokens.BITCOIN.BTCLN;
        case "BITCOIN":
            return Tokens.BITCOIN.BTC;
        case null:
        case undefined:
            return null;
        default:
            const [chainId, address] = identifier.split(":");
            return TokenResolver[chainId]?.getToken(address);
    }
}

export function getChainIdentifierForCurrency(token: Token): string {
    if(token==null) return null;
    if(isBtcToken(token)) {
        if(token.lightning) {
            return "LIGHTNING";
        } else {
            return "BITCOIN";
        }
    } else {
        return token.chainId;
    }
}
