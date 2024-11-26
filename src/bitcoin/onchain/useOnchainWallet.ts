
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {WebLNContext} from "../../context/WebLNContext";
import {BitcoinWalletContext} from "../../context/BitcoinWalletContext";
import * as BN from "bn.js";

export function useOnchainWallet() {

    const {bitcoinWallet, setBitcoinWallet} = useContext(BitcoinWalletContext);
    const [payError, setPayError] = useState<string>(null);
    const [payLoading, setPayLoading] = useState<boolean>(false);
    const [paySuccess, setPaySuccess] = useState<boolean>(false);
    const [payTxId, setPayTxId] = useState<string>(null);
    const sendingRef = useRef<boolean>(false);

    useEffect(() => {
        setPayError(null);
    }, [bitcoinWallet]);

    const pay = useCallback((address: string, amount: BN, feeRate?: number) => {
        if(sendingRef.current) return;
        sendingRef.current = true;
        setPayLoading(true);
        setPayError(null);
        setPaySuccess(null);
        bitcoinWallet.sendTransaction(address, amount, feeRate).then(resp => {
            setPayLoading(false);
            setPaySuccess(true);
            setPayTxId(resp);
            sendingRef.current = false;
        }).catch(e => {
            setPayLoading(false);
            setPaySuccess(false);
            setPayError(e.message);
            sendingRef.current = false;
            console.error(e);
        });
    }, [bitcoinWallet]);

    const disconnect = useCallback(() => {
        setBitcoinWallet(null);
    }, []);

    return {
        walletConnected: bitcoinWallet,
        disconnect,
        pay,
        payError,
        payLoading,
        paySuccess,
        payTxId
    }
}
