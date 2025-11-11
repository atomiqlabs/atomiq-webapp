import {
  FromBTCLNSwap,
  FromBTCSwap,
  IFromBTCSwap,
  ISwap,
  IToBTCSwap,
  SpvFromBTCSwap,
  SwapType,
  TokenAmount,
} from '@atomiqlabs/sdk';
import { ToBTCQuoteSummary } from './tobtc/ToBTCQuoteSummary';
import { LNURLWithdrawQuoteSummary } from './frombtc/LNURLWithdrawQuoteSummary';
import { FromBTCQuoteSummary } from './frombtc/FromBTCQuoteSummary';
import * as React from 'react';
import { useContext } from 'react';
import { FEConstants } from '../FEConstants';
import { SpvVaultFromBTCQuoteSummary } from './frombtc/SpvVaultFromBTCQuoteSummary';
import { useWithAwait } from '../utils/hooks/useWithAwait';
import { ChainDataContext } from '../wallets/context/ChainDataContext';
import { ChainWalletData } from '../wallets/ChainDataProvider';
import { getChainIdentifierForCurrency, toTokenIdentifier } from '../tokens/Tokens';
import { FromBTCLNQuoteSummary2 } from './frombtc/FromBTCLNQuoteSummary2';
import { ToBTCQuoteSummary2 } from './tobtc/ToBTCQuoteSummary2';
import {FromBTCQuoteSummary2} from "./frombtc/FromBTCQuoteSummary2";
import {SwapPageUIState} from "../pages/useSwapPage";

export function QuoteSummary(props: {
  quote: ISwap;
  refreshQuote: () => void;
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
        <ToBTCQuoteSummary2
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
        <FromBTCQuoteSummary2
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
      const _quote = props.quote as FromBTCLNSwap;
      if (_quote.lnurl != null && props.type !== 'swap') {
        //TODO: For now just mocked setAmountLock!!!
        swapElement = (
          <LNURLWithdrawQuoteSummary
            type={props.type}
            setAmountLock={() => {}}
            quote={_quote}
            refreshQuote={props.refreshQuote}
            autoContinue={props.autoContinue}
            notEnoughForGas={null}
          />
        );
      } else {
        swapElement = (
          <FromBTCLNQuoteSummary2
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
        <SpvVaultFromBTCQuoteSummary
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
