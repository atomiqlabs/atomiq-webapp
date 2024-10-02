import { PublicKey } from "@solana/web3.js";
import { FEConstants } from "../FEConstants";
import * as BN from "bn.js";
import BigNumber from "bignumber.js";
export const btcCurrency = {
    name: "Bitcoin (on-chain)",
    ticker: "BTC",
    decimals: 8,
    icon: "/icons/crypto/BTC.svg"
};
export const bitcoinCurrencies = [
    btcCurrency,
    {
        name: "Bitcoin (lightning)",
        ticker: "BTC-LN",
        decimals: 8,
        icon: "/icons/crypto/BTC.svg"
    }
];
export const nativeCurrency = {
    name: "Solana",
    ticker: "SOL",
    decimals: 9,
    address: new PublicKey(FEConstants.wsolToken),
    icon: "/icons/crypto/SOL.svg",
    minBalance: new BN(2500000)
};
export const smartChainCurrencies = [
    nativeCurrency,
    {
        name: "USD Circle",
        ticker: "USDC",
        decimals: 6,
        address: new PublicKey(FEConstants.usdcToken),
        icon: "/icons/crypto/USDC.svg"
    },
    {
        name: "Bonk",
        ticker: "BONK",
        decimals: 5,
        address: new PublicKey(FEConstants.bonkToken),
        icon: "/icons/crypto/BONK.png"
    }
];
const scCurrencyMap = {};
smartChainCurrencies.forEach(curr => {
    scCurrencyMap[curr.address.toString()] = curr;
});
export function isCurrencySpec(val) {
    return typeof (val.name) === "string" &&
        typeof (val.ticker) === "string" &&
        typeof (val.decimals) === "number" &&
        typeof (val.icon) === "string";
}
export function getNativeCurrency() {
    return smartChainCurrencies[0];
}
export function getCurrencySpec(address) {
    if (typeof (address) === "string" || address instanceof PublicKey)
        return scCurrencyMap[address.toString()];
    if (address.chain === "BTC") {
        return bitcoinCurrencies[address.lightning ? 1 : 0];
    }
    else {
        return scCurrencyMap[address.address.toString()];
    }
}
export function toHumanReadable(amount, currencySpec) {
    let spec;
    if (!isCurrencySpec(currencySpec)) {
        spec = scCurrencyMap[currencySpec.toString()];
    }
    else {
        spec = currencySpec;
    }
    return new BigNumber(amount.toString(10)).dividedBy(new BigNumber(10).pow(new BigNumber(spec.decimals)));
}
export function toHumanReadableString(amount, currencySpec) {
    let spec;
    if (!isCurrencySpec(currencySpec)) {
        spec = scCurrencyMap[currencySpec.toString()];
    }
    else {
        spec = currencySpec;
    }
    return new BigNumber(amount.toString(10)).dividedBy(new BigNumber(10).pow(new BigNumber(spec.decimals))).toFixed(spec.decimals);
}
export function fromHumanReadable(amount, currencySpec) {
    let spec;
    if (!isCurrencySpec(currencySpec)) {
        spec = scCurrencyMap[currencySpec.toString()];
    }
    else {
        spec = currencySpec;
    }
    return new BN(amount.multipliedBy(new BigNumber(10).pow(new BigNumber(spec.decimals))).toFixed(0));
}
export function fromHumanReadableString(amount, currencySpec) {
    if (amount === "")
        return null;
    let spec;
    if (!isCurrencySpec(currencySpec)) {
        spec = scCurrencyMap[currencySpec.toString()];
    }
    else {
        spec = currencySpec;
    }
    return new BN(new BigNumber(amount).multipliedBy(new BigNumber(10).pow(new BigNumber(spec.decimals))).toFixed(0));
}
