import * as BN from "bn.js";
import BigNumber from "bignumber.js";
import {fromDecimal, SCToken, toDecimal, Token, TokenResolver, Tokens} from "@atomiqlabs/sdk";

type TokensType = typeof Tokens;
type TokenTickers = {
    [Chain in keyof TokensType]: keyof TokensType[Chain];
}[keyof TokensType];

export const TokenIcons: {
    [C in TokenTickers]: string
} = {
    WBTC: null,
    USDC: "/icons/crypto/USDC.svg",
    USDT: null,
    SOL: "/icons/crypto/SOL.svg",
    BONK: "/icons/crypto/BONK.png",
    BTC: "/icons/crypto/BTC.svg",
    BTCLN: "/icons/crypto/BTC.svg"
};

export const bitcoinTokenArray = [
    Tokens.BITCOIN.BTC,
    Tokens.BITCOIN.BTCLN
];

export const smartChainTokenArray: SCToken[] = [];
for(let chainId in Tokens) {
    if(chainId==="BITCOIN") continue;
    for(let ticker in Tokens[chainId]) {
        smartChainTokenArray.push(Tokens[chainId][ticker]);
    }
}

export function toHumanReadable(amount: BN, currencySpec: Token): BigNumber {
    if(amount==null) return null;
    return new BigNumber(toHumanReadableString(amount, currencySpec));
}

export function toHumanReadableString(amount: BN, currencySpec: Token): string {
    if(amount==null) return null;
    return toDecimal(amount, currencySpec.decimals);
}

export function fromHumanReadable(amount: BigNumber, currencySpec: Token): BN {
    return new BN(amount.multipliedBy(new BigNumber(10).pow(new BigNumber(currencySpec.decimals))).toFixed(0));
}

export function fromHumanReadableString(amount: string, currencySpec: Token): BN {
    if(amount==="") return null;
    return fromDecimal(amount, currencySpec.decimals);
}