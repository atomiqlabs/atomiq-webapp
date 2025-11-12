import { useContext } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { LNURLPay, LNURLWithdraw, Swapper, SwapType, TokenAmount } from '@atomiqlabs/sdk';
import { useWithAwait } from '../utils/useWithAwait';

export type AddressDataResult = {
  address: string;
  type: string;
  swapType: SwapType;
  lnurl?: LNURLWithdraw | LNURLPay;
  min?: TokenAmount;
  max?: TokenAmount;
  amount?: TokenAmount;
};

export function useAddressData(
  addressString: string,
  callback?: (result: AddressDataResult, error: Error) => void
): [AddressDataResult, boolean, Error] {
  const { swapper } = useContext(SwapperContext);

  const [result, loading, error] = useWithAwait(
    async () => {
      if (swapper == null || addressString == null) return null;
      const parsed = await swapper.Utils.parseAddress(addressString);
      if (!parsed) throw new Error('Invalid address');
      return parsed;
    },
    [swapper, addressString],
    true,
    callback
  );

  return [result, loading, error];
}
