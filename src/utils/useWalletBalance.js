import { isBtcToken, isSCToken, SwapType } from "@atomiqlabs/sdk";
import { useContext, useEffect, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useStateRef } from "./hooks/useStateRef";
import { useChainForCurrency } from "../wallets/useChainForCurrency";
export function useWalletBalance(currency, swapType, swapChainId, requestGasDrop, pause, minBtcFeeRate) {
    const { swapper } = useContext(SwapsContext);
    const chain = useChainForCurrency(currency);
    const pauseRef = useStateRef(pause);
    const [maxSpendable, setMaxSpendable] = useState(null);
    useEffect(() => {
        setMaxSpendable(null);
        if (currency == null || (isBtcToken(currency) && currency.lightning))
            return;
        if (swapper == null)
            return;
        if (chain == null || chain.wallet == null)
            return;
        let canceled = false;
        let getBalance;
        if (isBtcToken(currency)) {
            getBalance = () => swapper.Utils.getBitcoinSpendableBalance(chain.wallet.instance, swapType, swapChainId, { gasDrop: requestGasDrop, minFeeRate: minBtcFeeRate });
        }
        else if (isSCToken(currency)) {
            getBalance = async () => {
                return {
                    balance: await swapper.Utils.getSpendableBalance(chain.wallet.instance, currency, { feeMultiplier: 1.5 })
                };
            };
        }
        if (getBalance == null)
            return;
        const fetchBalance = () => getBalance().then(resp => {
            if (canceled)
                return;
            if (pauseRef.current)
                return;
            setMaxSpendable(resp);
        });
        fetchBalance();
        const interval = setInterval(fetchBalance, 2 * 60 * 1000);
        return () => {
            clearInterval(interval);
            canceled = true;
        };
    }, [
        swapper, chain?.wallet,
        currency?.chain, currency?.ticker, currency?.chainId,
        swapType,
        swapType === SwapType.SPV_VAULT_FROM_BTC ? swapChainId : null,
        swapType === SwapType.SPV_VAULT_FROM_BTC ? requestGasDrop : false,
        minBtcFeeRate
    ]);
    return maxSpendable;
}
