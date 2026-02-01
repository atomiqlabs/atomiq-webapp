import { isBtcToken, isSCToken, SwapType, Token, TokenAmount } from '@atomiqlabs/sdk';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useStateRef } from '../utils/useStateRef';
import { useChain } from '../chains/useChain';
import {useWallet} from "./useWallet";

export type WalletBalanceResult = {
  balance: TokenAmount;
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

  const [maxSpendable, setMaxSpendable] = useState<{
    balance: TokenAmount;
    feeRate?: number;
  }>(null);

  useEffect(() => {
    setMaxSpendable(null);

    if (currency == null || (isBtcToken(currency) && currency.lightning)) return;
    if (swapper == null) return;
    if (wallet?.instance == null) return;

    let canceled = false;

    let getBalance: () => Promise<{ balance: TokenAmount; feeRate?: number }>;
    if (isBtcToken(currency)) {
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
  ]);

  return maxSpendable;
}
