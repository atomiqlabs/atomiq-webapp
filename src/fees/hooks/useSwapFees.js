import { useContext, useMemo } from "react";
import { ChainDataContext } from "../../wallets/context/ChainDataContext";
import { FeeType, FromBTCLNSwap, FromBTCSwap, IToBTCSwap, SpvFromBTCSwap } from "@atomiqlabs/sdk";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
import { capitalizeFirstLetter } from "../../utils/Utils";
import { getChainIdentifierForCurrency } from "../../tokens/Tokens";
export function useSwapFees(swap, btcFeeRate, fetchUsdAndNetworkFees = true) {
    const bitcoinChainData = useContext(ChainDataContext).BITCOIN;
    const fees = useMemo(() => {
        if (swap == null)
            return null;
        const fees = swap.getFeeBreakdown().map(value => {
            if (value.type === FeeType.SWAP) {
                return {
                    text: "Swap fee",
                    fee: value.fee,
                    composition: value.fee.composition
                };
            }
            if (value.type === FeeType.NETWORK_OUTPUT) {
                return {
                    text: capitalizeFirstLetter(getChainIdentifierForCurrency(value.fee.amountInDstToken.token)) + " network fee",
                    description: "Transaction fees on the output network",
                    fee: value.fee,
                    composition: value.fee.composition
                };
            }
        });
        if (swap instanceof FromBTCSwap) {
            const amount = swap.getClaimerBounty();
            fees.push({
                text: "Watchtower fee",
                description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                fee: { amountInSrcToken: amount, amountInDstToken: null, usdValue: amount.usdValue }
            });
        }
        return fees;
    }, [swap]);
    const btcWallet = bitcoinChainData?.wallet?.instance;
    const [feesWithUsdValue, feesLoading] = useWithAwait(() => {
        if (swap == null || fees == null || !fetchUsdAndNetworkFees)
            return null;
        let networkFeeSrc;
        let networkFeeDst;
        if (swap instanceof IToBTCSwap) {
            //Network fee at source
            networkFeeSrc = swap.getSmartChainNetworkFee();
        }
        else if (swap instanceof FromBTCLNSwap) {
            networkFeeDst = swap.getSmartChainNetworkFee();
        }
        if (swap instanceof FromBTCSwap || swap instanceof SpvFromBTCSwap) {
            if (btcWallet != null && btcFeeRate != null)
                networkFeeSrc = swap.estimateBitcoinFee(btcWallet, btcFeeRate);
        }
        const promises = [];
        if (networkFeeSrc != null)
            promises.push(networkFeeSrc.then(async (val) => {
                if (val == null)
                    return null;
                return {
                    text: capitalizeFirstLetter(getChainIdentifierForCurrency(val.token)) + " network fee",
                    description: "Transaction fees on the input network",
                    fee: { amountInSrcToken: val, amountInDstToken: null, usdValue: val.usdValue },
                    usdValue: await val.usdValue()
                };
            }));
        promises.push(...fees.map(async (val) => {
            return {
                ...val,
                usdValue: await val.fee.usdValue()
            };
        }));
        if (networkFeeDst != null)
            promises.push(networkFeeDst.then(async (val) => {
                return {
                    text: "Claim network fee",
                    description: "Transaction fees of the claim transaction on the output network",
                    fee: { amountInSrcToken: val, amountInDstToken: null, usdValue: val.usdValue },
                    usdValue: await val.usdValue()
                };
            }));
        return Promise.all(promises).then(values => values.filter(val => val != null));
    }, [fees, swap, btcWallet, btcFeeRate, fetchUsdAndNetworkFees]);
    const totalUsdFee = useMemo(() => {
        if (feesWithUsdValue == null)
            return;
        return feesWithUsdValue.reduce((value, e) => e.usdValue == null ? value : value + parseFloat(e.usdValue.toFixed(2)), 0);
    }, [feesWithUsdValue]);
    return {
        fees: feesWithUsdValue ?? fees ?? [],
        totalUsdFee
    };
}
