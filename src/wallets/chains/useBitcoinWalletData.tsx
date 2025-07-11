import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CloseButton, ListGroup, Modal} from "react-bootstrap";
import * as React from "react";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {ChainWalletData} from "../ChainDataProvider";
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import {BitcoinWalletType, getInstalledBitcoinWallets} from "./bitcoin/utils/BitcoinWalletUtils";

function BitcoinWalletModal(props: {
    modalOpened: boolean,
    setModalOpened: (opened: boolean) => void,
    connectWallet: (wallet?: BitcoinWalletType) => void,
    usableWallets: BitcoinWalletType[],
    installableWallets: BitcoinWalletType[]
}) {
    return (
        <Modal contentClassName="text-white bg-dark" size="sm" centered show={props.modalOpened} onHide={() => props.setModalOpened(false)} dialogClassName="min-width-400px">
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    Select a Bitcoin wallet
                    <CloseButton className="ms-auto" variant="white" onClick={() => props.setModalOpened(false)}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ListGroup variant="flush">
                    {props.usableWallets.map((e) => {
                        return (
                            <ListGroup.Item action key={e.name} onClick={() => props.connectWallet(e)} className="d-flex flex-row bg-transparent text-white border-0">
                                <img width={20} height={20} src={e.iconUrl} className="me-2"/>
                                <span>{e.name}</span>
                                <small className="ms-auto">Installed</small>
                            </ListGroup.Item>
                        );
                    })}
                    {props.installableWallets.map((e) => {
                        return (
                            <ListGroup.Item action key={e.name} href={e.installUrl} target="_blank" className="d-flex flex-row bg-transparent text-white border-0">
                                <img width={20} height={20} src={e.iconUrl} className="me-2"/>
                                <span>Install {e.name}</span>
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            </Modal.Body>
        </Modal>
    )
}

export function useBitcoinWalletData(connectedOtherChainWallets: {[chainName: string]: string}): [ChainWalletData<ExtensionBitcoinWallet>, JSX.Element] {
    const [bitcoinWallet, setBitcoinWallet] = React.useState<ExtensionBitcoinWallet>(undefined);
    const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[]>([]);
    const [installableWallets, setInstallableWallets] = useState<BitcoinWalletType[]>([]);

    const [autoConnect, setAutoConnect] = useLocalStorage<boolean>("btc-wallet-autoconnect", true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);

    const prevConnectedWalletRef = useRef<{[chainName: string]: string}>({});

    useEffect(() => {
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
        getInstalledBitcoinWallets().then(resp => {
            setUsableWallets(resp.installed);
            setInstallableWallets(resp.installable);
            if(resp.active!=null && bitcoinWallet==null) {
                resp.active().then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
            }
        }).catch(e => console.error(e));
    },[]);

    useEffect(() => {
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

    const connect = useCallback(() => {
        if(usableWallets.length===1) {
            connectWallet(usableWallets[0]).catch(e => {
                console.error(e);
            })
            return;
        } else {
            setModalOpened(true);
        }
    }, [usableWallets]);

    const [modalOpened, setModalOpened] = useState<boolean>(false);
    const modal = useMemo(() => (
        <BitcoinWalletModal modalOpened={modalOpened} setModalOpened={setModalOpened} connectWallet={(wallet) => {
            connectWallet(wallet).then(() => setModalOpened(false)).catch(err => console.error(err));
        }} usableWallets={usableWallets} installableWallets={installableWallets}/>
    ), [modalOpened, connectWallet, usableWallets, installableWallets]);

    return useMemo(() => [{
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
        id: "BITCOIN",
        connect: usableWallets.length>0 || installableWallets.length>0 ? connect : null,
        disconnect: bitcoinWallet!=null ? disconnect : null,
        changeWallet: bitcoinWallet!=null && usableWallets.length>1 ? connect : null
    }, modal], [bitcoinWallet, usableWallets, installableWallets, connect, disconnect, modal]);
}
