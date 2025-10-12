import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {wallet, WalletAccount} from "starknet";
import {getStarknet, StarknetWindowObject} from "@starknet-io/get-starknet-core";
import {StarknetFees, StarknetSigner} from "@atomiqlabs/chain-starknet";
import {ChainWalletData, WalletListData} from "../ChainDataProvider";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {FEConstants} from "../../FEConstants";
import {timeoutPromise} from "../../utils/Utils";

const starknet = getStarknet();

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

export function useStarknetWalletData(enabled: boolean): ChainWalletData<StarknetSigner> {
    const [starknetSigner, setStarknetSigner] = useState<StarknetSigner>();
    const [starknetWalletData, setStarknetWalletData] = useState<StarknetWindowObject>();
    const [defaultStarknetWallet, setStarknetAutoConnect] = useLocalStorage("starknet-wallet", null);

    const [nonInstalledWallet, setNonInstalledWallet] = useState<WalletListData[]>([]);
    const [availableWallets, setAvailableWallets] = useState<StarknetWindowObject[]>([]);

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
        const walletAccount = await WalletAccount.connect(FEConstants.starknetRpc, swo);
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
        if(!enabled) return;
        let cancelled = false;
        (async () => {
            await timeoutPromise(3000);
            const discoveryWallets = await starknet.getDiscoveryWallets();
            const availableWallets = await starknet.getAvailableWallets();
            if(cancelled) return;
            setAvailableWallets(availableWallets);
            setNonInstalledWallet(discoveryWallets.map(w => ({
                name: w.name,
                icon: w.icon,
                downloadLink: w.downloads[Object.keys(w.downloads)[0]]
            })));
            if(defaultStarknetWallet==null) return;

            const lastConnectedWallet = await starknet.getLastConnectedWallet();
            if(cancelled) return;
            if(lastConnectedWallet!=null) {
                const swo = await starknet.enable(lastConnectedWallet, {silent_mode: true});
                if(cancelled) return;
                console.log("useStarknetWalletContext(): Initial wallet connection: ", swo);
                setWallet(swo);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const _connect: (walletName: string) => Promise<void> = useCallback(async (walletName: string) => {
        if(availableWallets==null) return;
        const foundWallet = availableWallets.find(w => w.name===walletName);
        if(foundWallet==null) return;
        const swo = await starknet.enable(foundWallet, {silent_mode: false});
        setStarknetAutoConnect(swo?.id);
        setWallet(swo);
    }, [availableWallets]);

    const _disconnect: () => Promise<void> = useCallback(async () => {
        await starknet.disconnect({clearLastWallet: true}).catch(e => console.error("useStarknetWalletContext: error while disconnect", e));
        Object.keys(window.localStorage).forEach(val => {
            if(val.startsWith("gsw-last-")) window.localStorage.removeItem(val);
        });
        setStarknetAutoConnect(null);
        setWallet(null);
    }, []);

    return useMemo(() => !enabled ? null : {
        chain: {
            name: "Starknet",
            icon: "/icons/chains/STARKNET.svg"
        },
        wallet: starknetWalletData==null || starknetSigner==null ? null : {
            name: starknetWalletData.name,
            icon: typeof(starknetWalletData?.icon)!=="string" ? starknetWalletData?.icon?.dark : starknetWalletData?.icon,
            instance: starknetSigner,
            address: starknetSigner.getAddress()
        },
        installedWallets: availableWallets.map(w => ({
            name: w.name,
            icon: typeof(w.icon)==="string" ? w.icon : w.icon.dark,
            isConnected: w.name===starknetWalletData?.name
        })),
        nonInstalledWallets: nonInstalledWallet,
        chainId: "STARKNET",
        _connectWallet: _connect,
        _disconnect,
        swapperOptions: {
            rpcUrl: FEConstants.starknetRpc,
            chainId: FEConstants.starknetChainId,
            fees: new StarknetFees(FEConstants.starknetRpc)
        },
        hasWallets: availableWallets.length>0 || nonInstalledWallet.length>0
    }, [starknetWalletData, starknetSigner, _connect, _disconnect, availableWallets, nonInstalledWallet]);
}
