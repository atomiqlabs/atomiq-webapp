import {
  Token, toTokenAmount,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { useMemo } from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import {GenericFeePanel} from "./GenericFeePanel";


export function PlaceholderFeePanel(props: {
  inputToken?: Token;
  outputToken?: Token;
}) {
  const fees = useMemo(() => {
    if(!props.inputToken || !props.outputToken) return [];

    return [
      {
        text: 'Swap fee',
        fee: {
          amountInSrcToken: toTokenAmount(0n, props.inputToken, null),
          amountInDstToken: toTokenAmount(0n, props.outputToken, null),
          currentUsdValue: async () => 0,
          usdValue: async () => 0,
        },
        usdValue: 0,
      },
    ];
  }, [props.inputToken, props.outputToken]);

  const inputTokenUsdPrice = usePricing('1', props.inputToken);
  const outputTokenUsdPrice = usePricing('1', props.outputToken);

  const calculatedSwapPrice = useMemo(() => {
    if (!inputTokenUsdPrice || !outputTokenUsdPrice || inputTokenUsdPrice === 0) return null;
    return outputTokenUsdPrice / inputTokenUsdPrice;
  }, [inputTokenUsdPrice, outputTokenUsdPrice]);

  return (
    <GenericFeePanel
      inputToken={props.inputToken}
      outputToken={props.outputToken}
      fees={fees}
      totalUsdFee={0}
      price={calculatedSwapPrice}
    />
  );
}
