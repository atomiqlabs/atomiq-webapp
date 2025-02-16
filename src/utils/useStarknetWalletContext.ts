import {useCallback, useEffect, useRef, useState} from "react";
import {WalletAccount} from "starknet";
import {connect, disconnect, StarknetWindowObject} from "@starknet-io/get-starknet";
import {FEConstants} from "../FEConstants";
import {StarknetSigner, timeoutPromise} from "@atomiqlabs/sdk";
import {useLocalStorage} from "./useLocalStorage";

function waitTillAddressPopulated(acc: WalletAccount) {
    return new Promise<void>((resolve) => {
        let interval;
        interval = setInterval(() => {
            if(acc.address!="0x0000000000000000000000000000000000000000000000000000000000000000") {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
}

export function useStarknetWalletContext(): {
    starknetSigner: StarknetSigner,
    starknetWalletData: StarknetWindowObject,
    connect: () => Promise<void>,
    disconnect: () => Promise<void>,
    changeWallet: () => Promise<void>,
    reconnect: () => Promise<void>
} {
    const [starknetSigner, setStarknetSigner] = useState<StarknetSigner>();
    const [starknetWalletData, setStarknetWalletData] = useState<StarknetWindowObject>();
    const [defaultStarknetWallet, setStarknetAutoConnect] = useLocalStorage("starknet-wallet", null);

    const currentSWORef = useRef<{
        swo: StarknetWindowObject,
        listener: (accounts: string[]) => void
    }>();

    let setWallet: (swo: StarknetWindowObject) => Promise<void>;
    setWallet = async (swo: StarknetWindowObject) => {
        if(currentSWORef.current!=null) {
            currentSWORef.current.swo.off("accountsChanged", currentSWORef.current.listener);
            currentSWORef.current = null;
        }
        if(swo==null) {
            setStarknetSigner(null);
            setStarknetWalletData(null);
            return;
        }
        const walletAccount = new WalletAccount(FEConstants.starknetRpc, swo as any);
        currentSWORef.current = {
            swo,
            listener: (accounts: string[]) => {
                console.log("useStarknetWalletContext(): accountsChanged listener, new accounts: ", accounts);
                const starknetSigner = new StarknetSigner(walletAccount);
                setStarknetSigner(starknetSigner);
            }
        };
        swo.on("accountsChanged", currentSWORef.current.listener);
        await waitTillAddressPopulated(walletAccount);
        const starknetSigner = new StarknetSigner(walletAccount);
        setStarknetSigner(starknetSigner);
        setStarknetWalletData(swo);
    }

    useEffect(() => {
        if(!FEConstants.allowedChains.has("STARKNET")) return;
        if(defaultStarknetWallet==null) return;
        timeoutPromise(3000)
            .then(() => connect({ modalMode: 'neverAsk', modalTheme: 'dark', include: [defaultStarknetWallet]}))
            .then(swo => {
                console.log("useStarknetWalletContext(): Initial wallet connection: ", swo);
                setWallet(swo);
            });
    }, []);

    const _connect: () => Promise<void> = useCallback(async () => {
        console.log("useStarknetWalletContext(): connect()");
        const swo = await connect({ modalMode: 'alwaysAsk', modalTheme: 'dark' });
        console.log("useStarknetWalletContext(): connect() wallet connection: ", swo);
        setStarknetAutoConnect(swo.id);
        setWallet(swo);
    }, []);

    const _disconnect: () => Promise<void> = useCallback(async () => {
        console.log("useStarknetWalletContext(): disconnect()");
        await disconnect({clearLastWallet: true}).catch(e => console.error("useStarknetWalletContext: error while disconnect", e));
        Object.keys(window.localStorage).forEach(val => {
            if(val.startsWith("gsw-last-")) window.localStorage.removeItem(val);
        })
        setStarknetAutoConnect(null);
        setWallet(null);
    }, []);

    const reconnect: () => Promise<void> = useCallback(async () => {
        if(currentSWORef.current==null) return;
        console.log("useStarknetWalletContext(): reconnect()");
        const walletId = currentSWORef.current.swo.id;
        await _disconnect();
        const swo = await connect({ modalMode: 'neverAsk', modalTheme: 'dark', include: [walletId] });
        console.log("useStarknetWalletContext(): reconnect() wallet connection: ", swo);
        setStarknetAutoConnect(swo.id);
        setWallet(swo);
    }, []);

    const changeWallet: () => Promise<void> = useCallback(() => {
        console.log("useStarknetWalletContext(): changeWallet()");
        return _disconnect().then(() => _connect());
    }, []);

    return {starknetSigner, starknetWalletData, connect: _connect, disconnect: _disconnect, changeWallet, reconnect};

}