import {AbstractSigner, isBtcToken, isSCToken, toHumanReadableString, Token} from "@atomiqlabs/sdk";
import {useContext, useEffect, useState} from "react";
import {BitcoinWalletContext} from "../context/BitcoinWalletProvider";
import {SwapsContext} from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import {useStateRef} from "./useStateRef";
import {Tokens} from "../FEConstants";


export function useWalletBalance(
    signer: AbstractSigner,
    currency: Token,
    pause?: boolean
): {
    amountString: string,
    amount: BigNumber,
    rawAmount: bigint,
    feeRate: number,
    totalFee?: number
} {
    const {swapper} = useContext(SwapsContext);
    const {bitcoinWallet} = useContext(BitcoinWalletContext);

    const pauseRef = useStateRef(pause);

    const [_maxSpendable, setMaxSpendable] = useState<{
        amountString: string,
        amount: BigNumber,
        rawAmount: bigint,
        feeRate: number,
        totalFee?: number
    }>(null);
    let maxSpendable = _maxSpendable;
    if(currency!=null && isBtcToken(currency)) {
        if(!currency.lightning && bitcoinWallet==null) maxSpendable = null;
        if(currency.lightning) maxSpendable = null;
    }

    useEffect(() => {
        if(currency==null) {
            setMaxSpendable(null);
        }
    }, [currency?.chain, currency?.ticker, (currency as any)?.chainId]);

    useEffect(() => {
        if(currency==null || !isBtcToken(currency)) return;
        if(currency.lightning) return;

        setMaxSpendable(null);

        if(bitcoinWallet==null) return;

        let canceled = false;

        const fetchBalance = () => bitcoinWallet.getSpendableBalance().then(resp => {
            if(canceled) return;
            if(pauseRef.current) return;
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
        const interval = setInterval(fetchBalance, 2*60*1000);

        return () => {
            clearInterval(interval);
            canceled = true;
        }
    }, [bitcoinWallet, currency?.chain, currency?.ticker, (currency as any)?.chainId]);

    useEffect(() => {
        if(currency==null || !isSCToken(currency)) return;

        setMaxSpendable(null);

        if(swapper==null || signer==null) return;

        let canceled = false;

        const fetchBalance = () => swapper.getSpendableBalance(signer.getAddress(), currency, 1.25).then(resp => {
            if(canceled) return;
            if(pauseRef.current) return;
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
        const interval = setInterval(fetchBalance, 2*60*1000);

        return () => {
            clearInterval(interval);
            canceled = true;
        }
    }, [swapper, signer, currency?.chain, currency?.ticker, (currency as any)?.chainId]);

    return maxSpendable;
}
