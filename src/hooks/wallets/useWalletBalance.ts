import {isBtcToken, isSCToken, SwapType, Token, TokenAmount, toTokenAmount} from '@atomiqlabs/sdk';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useStateRef } from '../utils/useStateRef';
import { useChain } from '../chains/useChain';
import {useWallet} from "./useWallet";

export type WalletBalanceCallbackResult = {
  balance?: bigint,
  displayBalance?: bigint,
  feeRate?: number
}

export type WalletBalanceResult = {
  /**
   * Authoritative amount for limits, affordability checks, and execution.
   * Undefined means generic wallet-balance enforcement is intentionally disabled.
   */
  balance?: TokenAmount;
  /**
   * Presentation-only amount. Never use this for affordability or execution.
   */
  displayBalance?: TokenAmount;
  feeRate?: number;
};

export function useWalletBalance(
  currency: Token,
  swapType: SwapType,
  swapChainId?: string,
  requestGasDrop?: boolean,
  pause?: boolean,
  minBtcFeeRate?: number,
  input?: boolean
): WalletBalanceResult {
  const { swapper } = useContext(SwapperContext);
  const wallet = useWallet(currency, input);

  const pauseRef = useStateRef(pause);

  const [maxSpendable, setMaxSpendable] = useState<WalletBalanceResult>(null);

  useEffect(() => {
    setMaxSpendable(null);

    if (currency == null || (isBtcToken(currency) && currency.lightning)) return;
    if (swapper == null) return;
    if (wallet?.instance == null) return;

    let canceled = false;

    let getBalance: () => Promise<WalletBalanceResult>;
    if (wallet.getBalance != null) {
      getBalance = async () => {
        const result = await wallet.getBalance({
          currency,
          swapType,
          swapChainId,
          requestGasDrop,
          minBtcFeeRate,
          input,
        });
        return {
          balance: result.balance==null ? undefined : toTokenAmount(result.balance, currency, swapper.prices),
          displayBalance: result.displayBalance==null ? undefined : toTokenAmount(result.displayBalance, currency, swapper.prices),
          feeRate: result.feeRate
        }
      };
    } else if (isBtcToken(currency)) {
      getBalance = () =>
        swapper.Utils.getBitcoinSpendableBalance(wallet.instance, swapChainId, {
          gasDrop: requestGasDrop,
          minFeeRate: minBtcFeeRate,
        });
    } else if (isSCToken(currency)) {
      getBalance = async () => {
        return {
          balance: await swapper.Utils.getSpendableBalance(wallet.instance, currency, {
            feeMultiplier: 1.5,
          }),
        };
      };
    }
    if (getBalance == null) return;

    const fetchBalance = () =>
      getBalance().then((resp) => {
        if (canceled) return;
        if (pauseRef.current) return;
        setMaxSpendable(resp);
      });

    fetchBalance();
    const interval = setInterval(fetchBalance, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      canceled = true;
    };
  }, [
    swapper,
    wallet,
    currency?.chain,
    currency?.ticker,
    (currency as any)?.chainId,
    swapType,
    swapType === SwapType.SPV_VAULT_FROM_BTC ? swapChainId : null,
    swapType === SwapType.SPV_VAULT_FROM_BTC ? requestGasDrop : false,
    minBtcFeeRate,
    input,
  ]);

  return maxSpendable;
}
