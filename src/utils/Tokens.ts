import BigNumber from 'bignumber.js';
import {BitcoinNetwork, isBtcToken, isSCToken, SCToken, toHumanReadableString, Token} from '@atomiqlabs/sdk';
import {ChainsConfig} from "../data/ChainsConfig";
import {TokenResolver, Tokens} from "./SwapperFactory";

export const smartChainTokenArray: SCToken[] = [];

if (ChainsConfig.SOLANA) {
  smartChainTokenArray.push(Tokens.SOLANA.SOL);
  smartChainTokenArray.push(Tokens.SOLANA.USDC);
  smartChainTokenArray.push(Tokens.SOLANA.WBTC);
  smartChainTokenArray.push(Tokens.SOLANA.BONK);
}

if (ChainsConfig.CITREA) {
  smartChainTokenArray.push(Tokens.CITREA.CBTC);
  smartChainTokenArray.push(Tokens.CITREA.USDC);
}

if (ChainsConfig.BOTANIX) {
  smartChainTokenArray.push(Tokens.BOTANIX.BTC);
}

if(ChainsConfig.ALPEN) {
  smartChainTokenArray.push(Tokens.ALPEN.BTC);
}

if(ChainsConfig.GOAT) {
  smartChainTokenArray.push(Tokens.GOAT.BTC);
  smartChainTokenArray.push(Tokens.GOAT.PBTC);
}

if (ChainsConfig.STARKNET) {
  if(ChainsConfig.BITCOIN.network===BitcoinNetwork.MAINNET) {
    smartChainTokenArray.push(Tokens.STARKNET.WBTC);
    smartChainTokenArray.push(Tokens.STARKNET.strkBTC);
    smartChainTokenArray.push(Tokens.STARKNET.STRK);
    smartChainTokenArray.push(Tokens.STARKNET.ETH);
    smartChainTokenArray.push(Tokens.STARKNET.USDC);
  } else {
    smartChainTokenArray.push(Tokens.STARKNET._TESTNET_WBTC_VESU);
    smartChainTokenArray.push(Tokens.STARKNET._TESTNET_strkBTC);
    smartChainTokenArray.push(Tokens.STARKNET.STRK);
    smartChainTokenArray.push(Tokens.STARKNET.ETH);
  }
}

export const supportedSmartChainTokenIdentifiers = new Set(smartChainTokenArray.map(toTokenIdentifier));

export function toHumanReadable(amount: bigint, currencySpec: Token): BigNumber {
  if (amount == null) return null;
  return new BigNumber(toHumanReadableString(amount, currencySpec));
}

export function fromHumanReadable(amount: BigNumber, currencySpec: Token): bigint {
  return BigInt(
    amount.multipliedBy(new BigNumber(10).pow(new BigNumber(currencySpec.decimals))).toFixed(0)
  );
}

export function includesToken(tokenList: Token[], token: Token): boolean {
  return tokenList.find((val) => toTokenIdentifier(val) === toTokenIdentifier(token)) != null;
}

export function toTokenIdentifier(token: Token): string {
  if (token == null) return null;
  if (isBtcToken(token)) {
    return token.lightning ? 'LIGHTNING' : 'BITCOIN';
  } else if (isSCToken(token)) {
    return token.chainId + ':' + token.address;
  }
}

export function fromTokenIdentifier(identifier: string): Token {
  if (identifier == null) return null;
  switch (identifier) {
    case 'LIGHTNING':
      return Tokens.BITCOIN.BTCLN;
    case 'BITCOIN':
      return Tokens.BITCOIN.BTC;
    case null:
    case undefined:
      return null;
    default:
      const [chainId, address] = identifier.split(':');
      return TokenResolver[chainId]?.getToken(address);
  }
}

export function getChainIdentifierForCurrency(token: Token): string {
  if (token == null) return null;
  if (isBtcToken(token)) {
    if (token.lightning) {
      return 'LIGHTNING';
    } else {
      return 'BITCOIN';
    }
  } else {
    return token.chainId;
  }
}
