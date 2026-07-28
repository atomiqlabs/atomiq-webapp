import { useContext, useMemo } from 'react';
import {
  fromHumanReadableString,
  isBtcToken,
  isLNURLWithdraw,
  isSCToken,
} from '@atomiqlabs/sdk';
import type {
  ISwap,
  LNURLPay,
  LNURLWithdraw,
  Swapper,
  Token,
} from '@atomiqlabs/sdk';
import { SwapperContext } from '../../context/SwapperContext';
import { useWithAwait } from '../utils/useWithAwait';
import { toTokenIdentifier } from '../../utils/Tokens';
import {useWallet} from "../wallets/useWallet";

const btcFeeMaxOffset = 3;
const btcFeeMaxMultiple = 1.5;

function getRandomAddress(swapper: Swapper<any>, token: Token): string {
  if (isSCToken(token)) {
    return swapper.Utils.randomAddress(token.chainId);
  } else if (isBtcToken(token) && !token.lightning) {
    return swapper.Utils.randomAddress("BITCOIN");
  }
  return null;
}

export function useQuote(
  amount: string,
  exactIn: boolean,
  inToken: Token<any>,
  outToken: Token<any>,
  address: string | LNURLWithdraw | LNURLPay,
  gasDropAmount?: bigint,
  btcFeeRate?: number,
  pause?: boolean
): [() => void, ISwap, boolean, boolean, any] {
  const { swapper, initializedSwapper, stickyAddress } = useContext(SwapperContext);

  const inputWallet = useWallet(inToken, true);
  let inputAddress: string | LNURLWithdraw = inputWallet?.instance?._lnurl ?? inputWallet?.address;
  if (inToken != null && isBtcToken(inToken) && inToken.lightning && isLNURLWithdraw(address)) {
    inputAddress = address;
    address = null;
  }

  const outputWallet = useWallet(outToken, false);
  address ??= outputWallet?.address;

  const swapType = useMemo(() => {
    if (swapper != null && inToken != null && outToken != null)
      try {
        return swapper?.getSwapType(inToken, outToken);
      } catch (e) {}
    return null;
  }, [swapper, inToken, outToken]);

  const [result, loading, error, refresh] = useWithAwait(
    () => {
      console.log(
        'useQuote(): amount: ' +
          amount +
          ' exactIn: ' +
          exactIn +
          ' inToken: ' +
          inToken?.ticker +
          ' outToken: ' +
          outToken?.ticker +
          ' inputAddr: ' +
          inputAddress +
          ' outputAddr: ' +
          address +
          ' gasDropAmount: ' +
          gasDropAmount +
          ' btcFeeRate: ' +
          btcFeeRate +
          ' pause: ' +
          pause
      );
      if (initializedSwapper == null || inToken == null || outToken == null || amount == null || pause)
        return null;
      const outAddress = (address as any) ?? getRandomAddress(initializedSwapper, outToken);
      if (outAddress == null) return null;
      const inAddress = (inputAddress as any) ?? getRandomAddress(initializedSwapper, inToken);
      const rawAmount = fromHumanReadableString(amount, exactIn ? inToken : outToken);
      return initializedSwapper
        .swap(inToken, outToken, rawAmount, exactIn, inAddress, outAddress, {
          gasAmount: gasDropAmount,
          maxAllowedNetworkFeeRate:
            btcFeeRate == null ? null : btcFeeMaxOffset + btcFeeRate * btcFeeMaxMultiple,
          stickyAddress,
          // unsafeSkipLnNodeCheck: true,
          // unsafeZeroWatchtowerFee: swapType === SwapType.SPV_VAULT_FROM_BTC,
        })
        .then((quote) => {
          return { quote, random: address == null };
        });
    },
    [
      initializedSwapper,
      amount,
      exactIn,
      toTokenIdentifier(inToken),
      toTokenIdentifier(outToken),
      inputAddress,
      address,
      gasDropAmount,
    ],
    false,
    null,
    pause
  );

  const random = address == null;

  return [refresh, result?.quote, result?.random ?? random, loading, error];
}
