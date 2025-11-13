import {
  ISwap,
  Token,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { useSwapFees } from '../../hooks/fees/useSwapFees';
import {GenericFeePanel} from "./GenericFeePanel";


export function SwapFeePanel(props: {
  swap: ISwap | null;
  btcFeeRate?: number;
  isExpired?: boolean;
  totalTime?: number;
  remainingTime?: number;
  onRefreshQuote?: () => void;
}) {
  const { fees: swapFees, totalUsdFee } = useSwapFees(props.swap, props.btcFeeRate);

  const inputToken: Token = props.swap?.getInput()?.token;
  const outputToken: Token = props.swap?.getOutput()?.token;

  return (
    <GenericFeePanel
      inputToken={inputToken}
      outputToken={outputToken}
      fees={swapFees}
      isExpired={props.isExpired}
      price={props.swap.getPriceInfo().swapPrice}
      totalUsdFee={totalUsdFee}
      onRefreshQuote={props.onRefreshQuote}
      totalTime={props.totalTime}
      remainingTime={props.remainingTime}
    />
  );
}
