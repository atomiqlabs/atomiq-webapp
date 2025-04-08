import { isBtcToken, isSCToken, SwapType, toHumanReadableString } from "@atomiqlabs/sdk";
import { useContext, useEffect, useState } from "react";
import { BitcoinWalletContext } from "../context/BitcoinWalletProvider";
import { SwapsContext } from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import { useStateRef } from "./useStateRef";
import { Tokens } from "../FEConstants";
export function useWalletBalance(signer, currency, swapType, swapChainId, requestGasDrop, pause, minBtcFeeRate) {
    const { swapper } = useContext(SwapsContext);
    const { bitcoinWallet } = useContext(BitcoinWalletContext);
    const pauseRef = useStateRef(pause);
    const [_maxSpendable, setMaxSpendable] = useState(null);
    let maxSpendable = _maxSpendable;
    if (currency != null && isBtcToken(currency)) {
        if (!currency.lightning && bitcoinWallet == null)
            maxSpendable = null;
        if (currency.lightning)
            maxSpendable = null;
    }
    useEffect(() => {
        if (currency == null) {
            setMaxSpendable(null);
        }
    }, [currency?.chain, currency?.ticker, currency?.chainId]);
    useEffect(() => {
        if (currency == null || !isBtcToken(currency))
            return;
        if (currency.lightning)
            return;
        setMaxSpendable(null);
        if (swapper == null)
            return;
        if (bitcoinWallet == null)
            return;
        let canceled = false;
        const fetchBalance = () => bitcoinWallet.getFeeRate().then(feeRate => bitcoinWallet.getSpendableBalance(swapType === SwapType.SPV_VAULT_FROM_BTC ? swapper.getRandomSpvVaultPsbt(swapChainId, requestGasDrop) : null, minBtcFeeRate == null ? feeRate : Math.max(feeRate, minBtcFeeRate))).then(resp => {
            if (canceled)
                return;
            if (pauseRef.current)
                return;
            const amountString = toHumanReadableString(resp.balance, Tokens.BITCOIN.BTC);
            setMaxSpendable({
                rawAmount: resp.balance,
                amount: new BigNumber(amountString),
                amountString: amountString,
                feeRate: resp.feeRate,
                totalFee: resp.totalFee
            });
        });
        fetchBalance();
        const interval = setInterval(fetchBalance, 2 * 60 * 1000);
        return () => {
            clearInterval(interval);
            canceled = true;
        };
    }, [
        swapper, bitcoinWallet,
        currency?.chain, currency?.ticker, currency?.chainId,
        swapType, swapType === SwapType.SPV_VAULT_FROM_BTC ? swapChainId : null, swapType === SwapType.SPV_VAULT_FROM_BTC ? requestGasDrop : false,
        minBtcFeeRate
    ]);
    useEffect(() => {
        if (currency == null || !isSCToken(currency))
            return;
        setMaxSpendable(null);
        if (swapper == null || signer == null)
            return;
        let canceled = false;
        const fetchBalance = () => swapper.getSpendableBalance(signer.getAddress(), currency, 1.25).then(resp => {
            if (canceled)
                return;
            if (pauseRef.current)
                return;
            const amountString = toHumanReadableString(resp, currency);
            setMaxSpendable({
                amountString,
                rawAmount: resp,
                amount: new BigNumber(amountString),
                feeRate: null,
                totalFee: null
            });
        });
        fetchBalance();
        const interval = setInterval(fetchBalance, 2 * 60 * 1000);
        return () => {
            clearInterval(interval);
            canceled = true;
        };
    }, [swapper, signer, currency?.chain, currency?.ticker, currency?.chainId]);
    return maxSpendable;
}
