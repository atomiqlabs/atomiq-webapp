import * as BN from "bn.js";
import BigNumber from "bignumber.js";
import { fromDecimal, toDecimal, Tokens } from "@atomiqlabs/sdk";
export const TokenIcons = {
    WBTC: "/icons/crypto/WBTC.png",
    USDC: "/icons/crypto/USDC.svg",
    USDT: null,
    SOL: "/icons/crypto/SOL.svg",
    BONK: "/icons/crypto/BONK.png",
    BTC: "/icons/crypto/BTC.svg",
    BTCLN: "/icons/crypto/BTC.svg",
    ETH: "",
    STRK: ""
};
export const bitcoinTokenArray = [
    Tokens.BITCOIN.BTC,
    Tokens.BITCOIN.BTCLN
];
export const smartChainTokenArray = [
    Tokens.SOLANA.SOL,
    Tokens.SOLANA.USDC,
    Tokens.SOLANA.WBTC,
    Tokens.SOLANA.BONK,
    Tokens.STARKNET.ETH,
    Tokens.STARKNET.STRK
];
// for(let chainId in Tokens) {
//     if(chainId==="BITCOIN") continue;
//     for(let ticker in Tokens[chainId]) {
//         smartChainTokenArray.push(Tokens[chainId][ticker]);
//     }
// }
export function toHumanReadable(amount, currencySpec) {
    if (amount == null)
        return null;
    return new BigNumber(toHumanReadableString(amount, currencySpec));
}
export function toHumanReadableString(amount, currencySpec) {
    if (amount == null)
        return null;
    return toDecimal(amount, currencySpec.decimals);
}
export function fromHumanReadable(amount, currencySpec) {
    return new BN(amount.multipliedBy(new BigNumber(10).pow(new BigNumber(currencySpec.decimals))).toFixed(0));
}
export function fromHumanReadableString(amount, currencySpec) {
    if (amount === "")
        return null;
    return fromDecimal(amount, currencySpec.decimals);
}
