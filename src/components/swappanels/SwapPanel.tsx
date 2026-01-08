import {
  FromBTCLNAutoSwap,
  FromBTCLNSwap,
  FromBTCSwap,
  ISwap,
  IToBTCSwap,
  SpvFromBTCSwap,
  SwapType,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { SpvVaultFromBTCSwapPanel } from './frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel';
import { FromBTCLNSwapPanel } from './frombtc/lightning/FromBTCLNSwapPanel';
import { ToBTCSwapPanel } from './tobtc/ToBTCSwapPanel';
import {FromBTCSwapPanel} from "./frombtc/onchain/FromBTCSwapPanel";
import {SwapPageUIState} from "../../hooks/pages/useSwapPage";

export function SwapPanel(props: {
  quote: ISwap;
  refreshQuote: (clearAddress?: boolean) => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  balance?: bigint;
  autoContinue?: boolean;
  feeRate?: number;
  disabled?: boolean;
}) {
  if (!props.quote) {
    return null;
  }

  let swapElement: JSX.Element;

  switch (props.quote.getType()) {
    case SwapType.TO_BTC:
    case SwapType.TO_BTCLN:
      swapElement = (
        <ToBTCSwapPanel
          type={props.type}
          UICallback={props.UICallback}
          quote={props.quote as IToBTCSwap}
          refreshQuote={props.refreshQuote}
          autoContinue={props.autoContinue}
          notEnoughForGas={null}
          balance={props.balance}
        />
      );
      break;
    case SwapType.FROM_BTC:
      swapElement = (
        <FromBTCSwapPanel
          type={props.type}
          UICallback={props.UICallback}
          quote={props.quote as FromBTCSwap}
          refreshQuote={props.refreshQuote}
          abortSwap={props.abortSwap}
          notEnoughForGas={null}
          balance={props.balance}
          feeRate={props.feeRate}
        />
      );
      break;
    case SwapType.FROM_BTCLN:
    case SwapType.FROM_BTCLN_AUTO:
      const _quote = props.quote as FromBTCLNSwap | FromBTCLNAutoSwap;
      if (_quote.lnurl != null && props.type !== 'swap') {
        swapElement = <></>;
      } else {
        swapElement = (
          <FromBTCLNSwapPanel
            type={props.type}
            UICallback={props.UICallback}
            quote={_quote}
            refreshQuote={props.refreshQuote}
            abortSwap={props.abortSwap}
            notEnoughForGas={null}
          />
        );
      }
      break;
    case SwapType.SPV_VAULT_FROM_BTC:
      swapElement = (
        <SpvVaultFromBTCSwapPanel
          type={props.type}
          UICallback={props.UICallback}
          quote={props.quote as SpvFromBTCSwap<any>}
          refreshQuote={props.refreshQuote}
          abortSwap={props.abortSwap}
          balance={props.balance}
          feeRate={props.feeRate}
        />
      );
      break;
  }

  return swapElement;
}
