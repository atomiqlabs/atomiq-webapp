import {useContext, useMemo} from "react";
import {ChainDataContext} from "../../wallets/context/ChainDataContext";
import {
    Fee, FeeType,
    FromBTCSwap,
    IBitcoinWallet,
    IFromBTCSwap,
    ISwap,
    IToBTCSwap, PercentagePPM,
    SpvFromBTCSwap,
    TokenAmount
} from "@atomiqlabs/sdk";
import {useWithAwait} from "../../utils/hooks/useWithAwait";


const FeeDescriptions = {
    [FeeType.SWAP]: {
        text: "Swap fee"
    },
    [FeeType.NETWORK_OUTPUT]: {
        text: "Network fee",
        description: "Transaction fees on the output network"
    }
};

export type FeeDetails = {
    text: string,
    fee: Fee,
    usdValue?: number,
    className?: string,

    composition?: {
        percentage: PercentagePPM,
        base: TokenAmount
    },
    description?: string
}

export function useSwapFees(swap: ISwap, btcFeeRate?: number, fetchUsdAndNetworkFees: boolean = true): {
    fees: FeeDetails[],
    totalUsdFee: number
} {

    const bitcoinChainData = useContext(ChainDataContext).BITCOIN;

    const fees = useMemo(() => {
        if(swap==null) return null;
        const fees: FeeDetails[] = swap.getFeeBreakdown().map(value => {
            return {
                ...FeeDescriptions[value.type],
                fee: value.fee,
                composition: value.fee.composition
            }
        });
        if(swap instanceof FromBTCSwap) {
            const amount = swap.getClaimerBounty();
            fees.push({
                text: "Watchtower fee",
                description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                fee: {amountInSrcToken: amount, amountInDstToken: null, usdValue: amount.usdValue}
            });
        }
        return fees;
    }, [swap]);

    const [feesWithUsdValue, feesLoading] = useWithAwait((fees: FeeDetails[], swap: ISwap, btcWallet: IBitcoinWallet, btcFeeRate: number, fetchUsdAndNetworkFees: boolean) => {
        if(swap==null || fees==null || !fetchUsdAndNetworkFees) return null;
        let networkFeeSrc: Promise<TokenAmount>;
        let networkFeeDst: Promise<TokenAmount>;
        if(swap instanceof IToBTCSwap) {
            //Network fee at source
            networkFeeSrc = swap.getSmartChainNetworkFee();
        } else if(swap instanceof IFromBTCSwap) {
            networkFeeDst = swap.getSmartChainNetworkFee();
        }
        if(swap instanceof FromBTCSwap || swap instanceof SpvFromBTCSwap) {
            if(btcWallet!=null && btcFeeRate!=null) networkFeeSrc = swap.estimateBitcoinFee(btcWallet, btcFeeRate);
        }

        const promises: Promise<FeeDetails>[] = [];
        if(networkFeeSrc!=null) promises.push(networkFeeSrc.then(async(val) => {
            return {
                text: "Network fee",
                description: "Transaction fees on the input network",
                fee: {amountInSrcToken: val, amountInDstToken: null, usdValue: val.usdValue},
                usdValue: await val.usdValue()
            }
        }));
        promises.push(...fees.map(async (val) => {
            return {
                ...val,
                usdValue: await val.fee.usdValue()
            }
        }));
        if(networkFeeDst!=null) promises.push(networkFeeDst.then(async(val) => {
            return {
                text: "Claim network fee",
                description: "Transaction fees of the claim transaction on the output network",
                fee: {amountInSrcToken: val, amountInDstToken: null, usdValue: val.usdValue},
                usdValue: await val.usdValue()
            }
        }));

        return Promise.all(promises);
    }, [fees, swap, bitcoinChainData?.wallet?.instance, btcFeeRate, fetchUsdAndNetworkFees]);

    const totalUsdFee: number = useMemo(() => {
        if(feesWithUsdValue==null) return;
        return feesWithUsdValue.reduce(
            (value, e) => e.usdValue==null ? value : value+parseFloat(e.usdValue.toFixed(2)), 0
        );
    }, [feesWithUsdValue]);

    return {
        fees: fees ?? feesWithUsdValue ?? [],
        totalUsdFee
    }
}