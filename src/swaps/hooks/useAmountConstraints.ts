import { Token } from '@atomiqlabs/sdk';
import BigNumber from 'bignumber.js';
import { useContext, useEffect, useMemo, useState } from 'react';
import { toHumanReadable } from '../../tokens/Tokens';
import { SwapsContext } from '../context/SwapsContext';

const defaultConstraints = {
  min: 1n,
  max: null as bigint,
};

function toBigNumbers(
  input: { min: bigint; max: bigint },
  token: Token
): {
  min: BigNumber;
  max: BigNumber;
} {
  if (token == null) return null;
  if (input == null) return null;
  return {
    min: toHumanReadable(input.min, token),
    max: toHumanReadable(input.max, token),
  };
}

export function useAmountConstraints(
  inCurrency: Token,
  outCurrency: Token
): {
  input: { min: BigNumber; max: BigNumber };
  output: { min: BigNumber; max: BigNumber };
} {
  const { swapper } = useContext(SwapsContext);

  const [updateCount, setUpdateCounts] = useState<number>(0);

  useEffect(() => {
    if (swapper == null) return;
    let listener;
    swapper.on(
      'swapLimitsChanged',
      (listener = () => {
        console.log('useAmountConstraints(): Swap limits changed!');
        setUpdateCounts((prevState) => prevState + 1);
      })
    );
    return () => {
      swapper.removeListener('swapLimitsChanged', listener);
    };
  }, [swapper]);

  return useMemo(() => {
    if (swapper == null || inCurrency == null || outCurrency == null)
      return {
        input: toBigNumbers(defaultConstraints, inCurrency),
        output: toBigNumbers(defaultConstraints, outCurrency),
      };
    const res = swapper.getSwapLimits(inCurrency, outCurrency);
    return {
      input: toBigNumbers(
        { min: res.input.min?.rawAmount, max: res.input.max?.rawAmount },
        inCurrency
      ),
      output: toBigNumbers(
        { min: res.output.min?.rawAmount, max: res.output.max?.rawAmount },
        outCurrency
      ),
    };
  }, [swapper, inCurrency, outCurrency, updateCount]);
}
