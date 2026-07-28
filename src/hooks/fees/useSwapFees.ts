import { useMemo } from 'react';
import {
  Fee,
  FeeType,
  isFromBTCLNSwap,
  isFromBTCSwap,
  ISwap,
  isIToBTCSwap,
  isSpvFromBTCSwap,
  PercentagePPM,
  TokenAmount,
} from '@atomiqlabs/sdk';
import { useWithAwait } from '../utils/useWithAwait';
import { capitalizeFirstLetter } from '../../utils/Utils';
import { getChainIdentifierForCurrency } from '../../utils/Tokens';
import { Chain } from '../../providers/ChainsProvider';
import type {ExtensionBitcoinWallet} from "../../wallets/bitcoin/base/ExtensionBitcoinWallet";
import {useWallet} from "../wallets/useWallet";

export type FeeDetails = {
  text: string;
  fee: Fee;
  usdValue?: number;
  className?: string;

  composition?: {
    percentage: PercentagePPM;
    base: TokenAmount;
  };
  description?: string;
};

export function useSwapFees(
  swap: ISwap,
  btcFeeRate?: number,
  fetchUsdAndNetworkFees: boolean = true
): {
  fees: FeeDetails[];
  totalUsdFee: number;
} {
  const bitcoinWallet: Chain<ExtensionBitcoinWallet>["wallet"] = useWallet('BITCOIN', true);

  const fees = useMemo(() => {
    if (swap == null) return null;
    const fees: FeeDetails[] = swap.getFeeBreakdown().map((value) => {
      if (value.type === FeeType.SWAP) {
        return {
          text: 'Swap fee',
          fee: value.fee,
          composition: value.fee.composition,
        };
      }
      if (value.type === FeeType.NETWORK_OUTPUT) {
        return {
          text:
            capitalizeFirstLetter(getChainIdentifierForCurrency(value.fee.amountInDstToken.token)) +
            ' network fee',
          description: 'Transaction fees on the output network',
          fee: value.fee,
          composition: value.fee.composition,
        };
      }
    });
    if (isFromBTCSwap(swap)) {
      const amount = swap.getClaimerBounty();
      fees.push({
        text: 'Watchtower fee',
        description:
          'Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.',
        fee: {
          amountInSrcToken: amount,
          amountInDstToken: null,
          currentUsdValue: amount.usdValue,
          usdValue: amount.usdValue,
        },
      });
    }
    return fees;
  }, [swap]);

  const btcWallet = bitcoinWallet?.instance;
  const [feesWithUsdValue, feesLoading] = useWithAwait(() => {
    if (swap == null || fees == null || !fetchUsdAndNetworkFees) return null;
    let networkFeeSrc: Promise<TokenAmount>;
    let networkFeeDst: Promise<TokenAmount>;
    if (isIToBTCSwap(swap)) {
      //Network fee at source
      networkFeeSrc = swap.getSmartChainNetworkFee();
    } else if (isFromBTCLNSwap(swap)) {
      networkFeeDst = swap.getSmartChainNetworkFee();
    }
    if (isFromBTCSwap(swap) || isSpvFromBTCSwap(swap)) {
      if (btcWallet != null && btcFeeRate != null)
        networkFeeSrc = swap.estimateBitcoinFee(btcWallet, btcFeeRate);
    }

    const promises: Promise<FeeDetails>[] = [];
    if (networkFeeSrc != null)
      promises.push(
        networkFeeSrc.then(async (val) => {
          if (val == null) return null;
          const usdValue = await val.usdValue();
          return {
            text: capitalizeFirstLetter(getChainIdentifierForCurrency(val.token)) + ' network fee',
            description: 'Transaction fees on the input network',
            fee: {
              amountInSrcToken: val,
              amountInDstToken: null,
              currentUsdValue: val.usdValue,
              usdValue: () => Promise.resolve(usdValue),
            },
            usdValue
          };
        })
      );
    promises.push(
      ...fees.map(async (val) => {
        return {
          ...val,
          usdValue: await val.fee.usdValue(),
        };
      })
    );
    if (networkFeeDst != null)
      promises.push(
        networkFeeDst.then(async (val) => {
          const usdValue = await val.usdValue();
          return {
            text: 'Claim network fee',
            description: 'Transaction fees of the claim transaction on the output network',
            fee: {
              amountInSrcToken: val,
              amountInDstToken: null,
              currentUsdValue: val.usdValue,
              usdValue: () => Promise.resolve(usdValue),
            },
            usdValue
          };
        })
      );

    return Promise.all(promises).then((values) => values.filter((val) => val != null));
  }, [fees, swap, btcWallet, btcFeeRate, fetchUsdAndNetworkFees]);

  const totalUsdFee: number = useMemo(() => {
    if (feesWithUsdValue == null) return;
    return feesWithUsdValue.reduce(
      (value, e) => (e.usdValue == null ? value : value + parseFloat(e.usdValue.toFixed(2))),
      0
    );
  }, [feesWithUsdValue]);

  return {
    fees: feesWithUsdValue ?? fees ?? [],
    totalUsdFee,
  };
}
