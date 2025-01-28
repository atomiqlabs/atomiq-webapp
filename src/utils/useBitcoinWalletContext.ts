import {RefObject, useCallback, useEffect, useRef, useState} from "react";
import {BitcoinWalletType, getInstalledBitcoinWallets} from "../bitcoin/onchain/BitcoinWalletUtils";
import * as React from "react";
import {BitcoinWallet} from "../bitcoin/onchain/BitcoinWallet";
import {useWallet, Wallet} from "@solana/wallet-adapter-react";
import {useStateRef} from "./useStateRef";
import {useLocalStorage} from "./useLocalStorage";


export function useBitcoinWalletContext(): {
    bitcoinWallet: BitcoinWallet,
    connect: (walletType: BitcoinWalletType) => Promise<void>,
    disconnect: () => void,
    usableWallets: BitcoinWalletType[]
} {
    const [bitcoinWallet, setBitcoinWallet] = React.useState<BitcoinWallet>();
    const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[]>(null);

    const [autoConnect, setAutoConnect] = useLocalStorage<boolean>("btc-wallet-autoconnect", true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);

    const prevConnectedWalletRef = useRef<string>();

    const wallet = useWallet();
    useEffect(() => {
        if(wallet.wallet!=null && wallet.publicKey==null) return;
        console.log("useBitcoinWalletContext(): Solana wallet changed: ", wallet.wallet?.adapter?.name);
        if(prevConnectedWalletRef.current!=null && wallet.wallet==null) {
            setAutoConnect(true);
            if(bitcoinWalletRef.current!=null && bitcoinWalletRef.current.wasAutomaticallyInitiated) disconnect(true);
        }
        prevConnectedWalletRef.current = wallet.wallet?.adapter?.name;
        if(wallet.wallet==null) return;
        if(!autoConnect) return;
        const activeWallet = BitcoinWallet.loadState();
        console.log("useBitcoinWalletContext(): Current active wallet: ", activeWallet);
        if(usableWallets==null) return;
        if(activeWallet==null) {
            const bitcoinWalletType = usableWallets.find(walletType => walletType.name===wallet.wallet.adapter.name);
            console.log("useBitcoinWalletContext(): Found matching bitcoin wallet: ", bitcoinWalletType);
            if(bitcoinWalletType!=null) bitcoinWalletType.use({multichainConnected: true}).then(wallet => setBitcoinWallet(wallet)).catch(e => {
                console.error(e);
            });
        }
    }, [wallet.publicKey, usableWallets]);

    useEffect(() => {
        getInstalledBitcoinWallets().then(resp => {
            setUsableWallets(resp.installed);
            if(resp.active!=null && bitcoinWallet==null) {
                resp.active().then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
            }
        }).catch(e => console.error(e));
    },[]);

    useEffect(() => {
        console.log("useBitcoinWalletContext(): Bitcoin wallet changed: ", bitcoinWallet);
        if(bitcoinWallet==null) return;
        let listener: (newWallet: BitcoinWallet) => void;
        bitcoinWallet.onWalletChanged(listener = (newWallet: BitcoinWallet) => {
            console.log("New bitcoin wallet set: ", newWallet);
            if(newWallet==null) {
                BitcoinWallet.clearState();
                setBitcoinWallet(null);
                return;
            }
            if(bitcoinWallet.getReceiveAddress()===newWallet.getReceiveAddress()) return;
            setBitcoinWallet(newWallet);
        });
        return () => {
            bitcoinWallet.offWalletChanged(listener);
        }
    },[bitcoinWallet]);

    const connect: (bitcoinWalletType: BitcoinWalletType) => Promise<void> = useCallback(async (bitcoinWalletType: BitcoinWalletType) => {
        const wallet = await bitcoinWalletType.use();
        return setBitcoinWallet(wallet);
    }, []);

    const disconnect: (skipToggleAutoConnect?: boolean) => void = useCallback((skipToggleAutoConnect?: boolean) => {
        if(!skipToggleAutoConnect && bitcoinWalletRef.current!=null && bitcoinWalletRef.current.wasAutomaticallyInitiated) setAutoConnect(false);
        BitcoinWallet.clearState();
        setBitcoinWallet(null);
    }, []);

    return {bitcoinWallet, connect, disconnect, usableWallets: usableWallets ?? []};

}