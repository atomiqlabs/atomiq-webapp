import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { BitcoinWalletContext } from "../../context/BitcoinWalletContext";
export function useOnchainWallet() {
    const { bitcoinWallet, setBitcoinWallet } = useContext(BitcoinWalletContext);
    const [payError, setPayError] = useState(null);
    const [payLoading, setPayLoading] = useState(false);
    const [paySuccess, setPaySuccess] = useState(false);
    const [payTxId, setPayTxId] = useState(null);
    const sendingRef = useRef(false);
    useEffect(() => {
        setPayError(null);
    }, [bitcoinWallet]);
    const pay = useCallback((address, amount, feeRate) => {
        if (sendingRef.current)
            return;
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
            setPayError(e);
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
    };
}
