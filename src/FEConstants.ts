import BigNumber from 'bignumber.js';

const statsUrl: string = import.meta.env.VITE_STATS_URL;

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
