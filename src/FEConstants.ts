import BigNumber from 'bignumber.js';
import { SwapperFactory } from '@atomiqlabs/sdk';
import { SolanaInitializer, SolanaInitializerType } from '@atomiqlabs/chain-solana';
import { StarknetInitializer, StarknetInitializerType } from '@atomiqlabs/chain-starknet';
import {
  CitreaInitializer,
  CitreaInitializerType,
} from "@atomiqlabs/chain-evm";

const statsUrl: string = import.meta.env.VITE_STATS_URL;

export const Factory = new SwapperFactory<
  readonly [SolanaInitializerType, StarknetInitializerType, CitreaInitializerType]
>([SolanaInitializer, StarknetInitializer, CitreaInitializer] as const);

export const Tokens = Factory.Tokens;
export const TokenResolver = Factory.TokenResolver;

console.log('Factory: ', Factory);

export const FEConstants = {
  statsUrl,
  satsPerBitcoin: new BigNumber(100000000),
  USDollar: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }),
  trustedGasSwapLp: import.meta.env.VITE_TRUSTED_GAS_SWAP,
  defaultLp: import.meta.env.VITE_DEFAULT_LP?.split(','),
};
