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

export function QuoteSummary(props: {
  quote: ISwap;
  refreshQuote: () => void;
  setAmountLock?: (isLocked: boolean) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  balance?: bigint;
  autoContinue?: boolean;
  feeRate?: number;
  disabled?: boolean;
}) {
  const chainsData = useContext(ChainDataContext);

  const [notEnoughForGas] = useWithAwait(async () => {
    if (props.quote == null || props.quote.isInitiated()) return;
    let result: {
      enoughBalance: boolean;
      balance: TokenAmount;
      required: TokenAmount;
    };
    let address: string;
    if (props.quote instanceof IToBTCSwap) {
      result = await props.quote.hasEnoughForTxFees();
      address = props.quote._getInitiator();
    } else if (props.quote instanceof IFromBTCSwap) {
      result = await props.quote.hasEnoughForTxFees();
      address = props.quote._getInitiator();
    } else {
      return;
    }
    if (!result.enoughBalance) {
      const chainIdentifer = getChainIdentifierForCurrency(result.required.token);
      const chainData: ChainWalletData<any> = chainsData[chainIdentifer];
      if (chainData.wallet?.address == address) {
        return (
          FEConstants.scBalances[toTokenIdentifier(result.required.token)].optimal +
          result.required.rawAmount -
          result.balance.rawAmount
        );
      }
    }
  }, [props.quote, chainsData]);

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
          setAmountLock={props.setAmountLock}
          quote={props.quote as IToBTCSwap}
          refreshQuote={props.refreshQuote}
          autoContinue={props.autoContinue}
          notEnoughForGas={notEnoughForGas}
          balance={props.balance}
        />
      );
      break;
    case SwapType.FROM_BTC:
      swapElement = (
        <FromBTCQuoteSummary2
          type={props.type}
          setAmountLock={props.setAmountLock}
          quote={props.quote as FromBTCSwap}
          refreshQuote={props.refreshQuote}
          abortSwap={props.abortSwap}
          notEnoughForGas={notEnoughForGas}
          balance={props.balance}
          feeRate={props.feeRate}
        />
      );
      break;
    case SwapType.FROM_BTCLN:
      const _quote = props.quote as FromBTCLNSwap;
      if (_quote.lnurl != null && props.type !== 'swap') {
        swapElement = (
          <LNURLWithdrawQuoteSummary
            type={props.type}
            setAmountLock={props.setAmountLock}
            quote={_quote}
            refreshQuote={props.refreshQuote}
            autoContinue={props.autoContinue}
            notEnoughForGas={notEnoughForGas}
          />
        );
      } else {
        swapElement = (
          <FromBTCLNQuoteSummary2
            type={props.type}
            setAmountLock={props.setAmountLock}
            quote={_quote}
            refreshQuote={props.refreshQuote}
            abortSwap={props.abortSwap}
            notEnoughForGas={notEnoughForGas}
          />
        );
      }
      break;
    case SwapType.SPV_VAULT_FROM_BTC:
      swapElement = (
        <SpvVaultFromBTCQuoteSummary
          type={props.type}
          setAmountLock={props.setAmountLock}
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
