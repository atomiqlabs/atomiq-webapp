import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CloseButton, ListGroup, Modal} from "react-bootstrap";
import * as React from "react";
import {useWallet} from "@solana/wallet-adapter-react";
import {useLocalStorage} from "../../utils/hooks/useLocalStorage";
import {useStateRef} from "../../utils/hooks/useStateRef";
import {ChainWalletData} from "../ChainDataProvider";
import { BitcoinWallet } from './bitcoin/base/BitcoinWallet';
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

export function useBitcoinWalletData(): [ChainWalletData<BitcoinWallet>, JSX.Element] {
    const [bitcoinWallet, setBitcoinWallet] = React.useState<BitcoinWallet>(undefined);
    const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[]>([]);
    const [installableWallets, setInstallableWallets] = useState<BitcoinWalletType[]>([]);

    const [autoConnect, setAutoConnect] = useLocalStorage<boolean>("btc-wallet-autoconnect", true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);

    const prevConnectedWalletRef = useRef<string>();

    const wallet = useWallet();
    useEffect(() => {
        if(wallet.wallet!=null && wallet.publicKey==null) return;
        console.log("BitcoinWalletProvider(): Solana wallet changed: ", wallet.wallet?.adapter?.name);
        if(prevConnectedWalletRef.current!=null && wallet.wallet==null) {
            setAutoConnect(true);
            if(bitcoinWalletRef.current!=null && bitcoinWalletRef.current.wasAutomaticallyInitiated) disconnect(true);
        }
        prevConnectedWalletRef.current = wallet.wallet?.adapter?.name;
        if(wallet.wallet==null) return;
        if(!autoConnect) return;
        const activeWallet = BitcoinWallet.loadState();
        console.log("BitcoinWalletProvider(): Current active wallet: ", activeWallet);
        if(usableWallets==null) return;
        if(activeWallet==null) {
            const bitcoinWalletType = usableWallets.find(walletType => walletType.name===wallet.wallet.adapter.name);
            console.log("BitcoinWalletProvider(): Found matching bitcoin wallet: ", bitcoinWalletType);
            if(bitcoinWalletType!=null) bitcoinWalletType.use({multichainConnected: true}).then(wallet => setBitcoinWallet(wallet)).catch(e => {
                console.error(e);
            });
        }
    }, [wallet.publicKey, usableWallets]);

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
        console.log("BitcoinWalletProvider(): Bitcoin wallet changed: ", bitcoinWallet);
        if(bitcoinWallet==null) return;
        let listener: (newWallet: BitcoinWallet) => void;
        bitcoinWallet.onWalletChanged(listener = (newWallet: BitcoinWallet) => {
            console.log("BitcoinWalletProvider(): New bitcoin wallet set: ", newWallet);
            if(newWallet==null) {
                BitcoinWallet.clearState();
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
        BitcoinWallet.clearState();
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
