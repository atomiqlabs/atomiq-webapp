import { isBtcToken, isSCToken, Tokens } from "@atomiqlabs/sdk";
import { useContext, useEffect, useState } from "react";
import { BitcoinWalletContext } from "../context/BitcoinWalletContext";
import { SwapsContext } from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import { toHumanReadableString } from "./Currencies";
import { useStateRef } from "./useStateRef";
export function useWalletBalance(signer, currency, pause) {
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
    }, [currency]);
    useEffect(() => {
        if (currency == null || !isBtcToken(currency))
            return;
        if (currency.lightning)
            return;
        setMaxSpendable(null);
        if (bitcoinWallet == null)
            return;
        let canceled = false;
        const fetchBalance = () => bitcoinWallet.getSpendableBalance().then(resp => {
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
    }, [currency, bitcoinWallet]);
    useEffect(() => {
        if (currency == null || !isSCToken(currency))
            return;
        setMaxSpendable(null);
        if (swapper == null || signer == null)
            return;
        let canceled = false;
        const fetchBalance = () => swapper.getBalance(signer.getAddress(), currency).then(resp => {
            if (canceled)
                return;
            if (pauseRef.current)
                return;
            const amountString = toHumanReadableString(resp, currency);
            setMaxSpendable({
                amountString,
                rawAmount: resp,
                amount: new BigNumber(amountString),
                feeRate: 0,
                totalFee: null
            });
        });
        fetchBalance();
        const interval = setInterval(fetchBalance, 2 * 60 * 1000);
        return () => {
            clearInterval(interval);
            canceled = true;
        };
    }, [swapper, currency, signer]);
    return maxSpendable;
}
