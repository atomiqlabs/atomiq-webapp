import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as React from "react";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {ChainWalletData} from "../ChainDataProvider";
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import {BitcoinWalletType, getInstalledBitcoinWallets} from "./bitcoin/utils/BitcoinWalletUtils";

export function useBitcoinWalletData(enabled: boolean, connectedOtherChainWallets: {[chainName: string]: string}): ChainWalletData<ExtensionBitcoinWallet> {
    const [bitcoinWallet, setBitcoinWallet] = React.useState<ExtensionBitcoinWallet>(undefined);
    const [nonInstalledWallets, setNonInstalledWallets] = useState<BitcoinWalletType[]>([]);
    const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[]>([]);

    const [autoConnect, setAutoConnect] = useLocalStorage<boolean>("btc-wallet-autoconnect", true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);

    const prevConnectedWalletRef = useRef<{[chainName: string]: string}>({});

    useEffect(() => {
        if(!enabled) return;
        for(let chainName in connectedOtherChainWallets) {
            const oldWalletName = prevConnectedWalletRef.current[chainName];
            const newWalletName = connectedOtherChainWallets[chainName];
            if(prevConnectedWalletRef.current[chainName] == connectedOtherChainWallets[chainName]) continue;
            const activeWallet = ExtensionBitcoinWallet.loadState();
            if(oldWalletName!=null && newWalletName==null && activeWallet?.name===oldWalletName) {
                setAutoConnect(true);
                if(bitcoinWalletRef.current!=null && bitcoinWalletRef.current.wasAutomaticallyInitiated) disconnect(true);
            }
            prevConnectedWalletRef.current[chainName] = newWalletName;
            if(newWalletName==null) continue;
            if(!autoConnect) continue;
            if(usableWallets==null) continue;
            if(activeWallet==null) {
                const bitcoinWalletType = usableWallets.find(walletType => walletType.name===newWalletName);
                console.log("useBitcoinWalletData(): useEffect(autoconnect): found matching bitcoin wallet: ", bitcoinWalletType);
                if(bitcoinWalletType!=null) bitcoinWalletType.use({multichainConnected: true}).then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
                return;
            }
        }
    }, [connectedOtherChainWallets, usableWallets]);

    useEffect(() => {
        if(!enabled) return;
        getInstalledBitcoinWallets().then(resp => {
            setUsableWallets(resp.installed);
            setNonInstalledWallets(resp.installable);
            if(resp.active!=null && bitcoinWallet==null) {
                resp.active().then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
            }
        }).catch(e => console.error(e));
    },[]);

    useEffect(() => {
        if(!enabled) return;
        if(bitcoinWallet==null) return;
        let listener: (newWallet: ExtensionBitcoinWallet) => void;
        bitcoinWallet.onWalletChanged(listener = (newWallet: ExtensionBitcoinWallet) => {
            console.log("useBitcoinWalletData(): useEffect(walletChangeListener): New bitcoin wallet set: ", newWallet);
            if(newWallet==null) {
                ExtensionBitcoinWallet.clearState();
                setBitcoinWallet(undefined);
                return;
            }
            if(bitcoinWallet.getReceiveAddress()===newWallet.getReceiveAddress()) return;
            setBitcoinWallet(newWallet);
        });
        return () => {
            bitcoinWallet.offWalletChanged(listener);
        }
    },[bitcoinWallet]);

    const connectWallet: (bitcoinWalletType: BitcoinWalletType) => Promise<void> = useCallback(async (bitcoinWalletType: BitcoinWalletType) => {
        const wallet = await bitcoinWalletType.use();
        return setBitcoinWallet(wallet);
    }, []);

    const disconnect: (skipToggleAutoConnect?: boolean) => void = useCallback((skipToggleAutoConnect?: boolean) => {
        if(skipToggleAutoConnect!==true && bitcoinWalletRef.current!=null && bitcoinWalletRef.current.wasAutomaticallyInitiated) setAutoConnect(false);
        ExtensionBitcoinWallet.clearState();
        setBitcoinWallet(undefined);
    }, []);

    const connect = useCallback((walletName: string) => {
        if(usableWallets==null) return;
        const foundWallet = usableWallets.find(w => w.name===walletName);
        if(foundWallet==null) return;
        return connectWallet(foundWallet).catch(e => {
            console.error(e);
        });
    }, [usableWallets]);

    return useMemo(() => !enabled ? null : ({
        chain: {
            name: "Bitcoin",
            icon: "/icons/chains/BITCOIN.svg"
        },
        wallet: bitcoinWallet==null ? null : {
            name: bitcoinWallet.getName(),
            icon: bitcoinWallet.getIcon(),
            instance: bitcoinWallet,
            address: bitcoinWallet.getReceiveAddress()
        },
        installedWallets: usableWallets.map(w => ({
            name: w.name,
            icon: w.iconUrl,
            isConnected: w.name===bitcoinWallet?.getName(),
        })),
        nonInstalledWallets: nonInstalledWallets.map(w => ({
            name: w.name,
            icon: w.iconUrl,
            downloadLink: w.installUrl
        })),
        chainId: "BITCOIN",
        _connectWallet: connect,
        _disconnect: bitcoinWallet!=null ? disconnect : null,
        hasWallets: usableWallets.length>0 || nonInstalledWallets.length>0
    }), [bitcoinWallet, usableWallets, nonInstalledWallets, connect, disconnect]);
}
