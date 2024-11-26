import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {WebLNContext} from "../../context/WebLNContext";

export function useLightningWallet() {

    const {lnWallet, setLnWallet} = useContext(WebLNContext);
    const [payError, setPayError] = useState<string>(null);
    const [payLoading, setPayLoading] = useState<boolean>(false);
    const [paySuccess, setPaySuccess] = useState<boolean>(false);
    const sendingRef = useRef<boolean>(false);

    useEffect(() => {
        setPayError(null);
    }, [lnWallet]);

    const pay = useCallback((lnpr: string) => {
        if(sendingRef.current) return;
        sendingRef.current = true;
        setPayLoading(true);
        setPayError(null);
        setPaySuccess(null);
        lnWallet.sendPayment(lnpr).then(resp => {
            setPayLoading(false);
            setPaySuccess(true);
            sendingRef.current = false;
        }).catch(e => {
            setPayLoading(false);
            setPaySuccess(false);
            setPayError(e.message);
            sendingRef.current = false;
            console.error(e);
        });
    }, [lnWallet]);

    const disconnect = useCallback(() => {
        setLnWallet(null);
    }, []);

    return {
        walletConnected: lnWallet!=null,
        disconnect,
        pay,
        payError,
        payLoading,
        paySuccess
    }
}
