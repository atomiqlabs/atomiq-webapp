import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {wallet, WalletAccount} from "starknet";
import {connect, disconnect, StarknetWindowObject} from "@starknet-io/get-starknet";
import { StarknetSigner } from "@atomiqlabs/chain-starknet";
import {ChainWalletData} from "../WalletProvider";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {FEConstants} from "../../FEConstants";
import {timeoutPromise} from "../../utils/Utils";

function waitTillAddressPopulated(acc: WalletAccount) {
    return new Promise<void>((resolve) => {
        let interval;
        interval = setInterval(() => {
            if(acc.address!="0x0000000000000000000000000000000000000000000000000000000000000000" && acc.address!=="") {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
}

export function useStarknetWalletData(): [ChainWalletData<StarknetSigner>] {
    const [starknetSigner, setStarknetSigner] = useState<StarknetSigner>();
    const [starknetWalletData, setStarknetWalletData] = useState<StarknetWindowObject>();
    const [defaultStarknetWallet, setStarknetAutoConnect] = useLocalStorage("starknet-wallet", null);

    const currentSWORef = useRef<{
        swo: StarknetWindowObject,
        listener: (accounts: string[]) => void
    }>();

    const setWallet: (swo: StarknetWindowObject) => Promise<void> = async (swo: StarknetWindowObject) => {
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
        const chainId = await wallet.requestChainId(walletAccount.walletProvider);
        console.log("useStarknetWalletContext(): connected wallet chainId: ", chainId);
        if(chainId!=null && FEConstants.starknetChainId!==chainId) {
            setStarknetSigner(null);
            setStarknetWalletData(null);
            console.log("useStarknetWalletContext(): Invalid chainId got from wallet...");
            return;
        }
        currentSWORef.current = {
            swo,
            listener: (accounts: string[]) => {
                console.log("useStarknetWalletContext(): accountsChanged listener, new accounts: ", accounts);
                const starknetSigner = new StarknetSigner(walletAccount);
                wallet.requestChainId(walletAccount.walletProvider).then(chainId => {
                    console.log("useStarknetWalletContext(): connected wallet chainId: ", chainId);
                    if(FEConstants.starknetChainId!==chainId) {
                        setStarknetSigner(null);
                    } else {
                        setStarknetSigner(starknetSigner);
                    }
                })
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
        setStarknetAutoConnect(swo?.id);
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

    const changeWallet: () => Promise<void> = useCallback(() => {
        console.log("useStarknetWalletContext(): changeWallet()");
        return _disconnect().then(() => _connect());
    }, []);

    return useMemo(() => [{
        chain: {
            name: "Starknet",
            icon: "/icons/chains/STARKNET.svg"
        },
        wallet: starknetWalletData==null || starknetSigner==null ? null : {
            name: starknetWalletData.name,
            icon: typeof(starknetWalletData?.icon)!=="string" ? starknetWalletData?.icon?.dark : starknetWalletData?.icon,
            instance: starknetSigner
        },
        connect: _connect,
        disconnect: _disconnect,
        changeWallet
    }], [starknetWalletData, starknetSigner, _connect, _disconnect, changeWallet]);
}
