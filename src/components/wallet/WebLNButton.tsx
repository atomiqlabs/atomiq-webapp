import {Button, CloseButton, Dropdown, ListGroup, Modal} from "react-bootstrap";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import * as React from "react";
import {BitcoinNetworkType, getAddress, getCapabilities} from "sats-connect";
import {useContext, useEffect, useState} from "react";
import {BitcoinWalletContext} from "../../context/BitcoinWalletContext";
import {BitcoinWalletType, getInstalledBitcoinWallets} from "../../bitcoin/onchain/BitcoinWalletUtils";
import {ic_brightness_1} from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
import {connectWebLN, isWebLNInstalled} from "../../bitcoin/lightning/WebLNUtils";
import {WebLNContext} from "../../context/WebLNContext";

export function useWebLNWalletChooser() {

    const {lnWallet, setLnWallet} = useContext(WebLNContext);

    const isInstalled = isWebLNInstalled();

    const connectWallet = () => {
        connectWebLN().then(res => {
            setLnWallet(res);
        }).catch(e => console.error(e));
    };

    return {isInstalled, lnWallet, connectWallet, setLnWallet};
}

export function WebLNButton(props: {}) {

    const {isInstalled, lnWallet, connectWallet} = useWebLNWalletChooser();

    if(!isInstalled && lnWallet==null) return <></>;

    return (
        <>
            {lnWallet==null ? (
                <Button variant="dark" className={"me-2 px-3"} onClick={() => connectWallet()}>
                    Connect BTC-LN wallet
                </Button>
            ) : (
                <Button variant="dark" className={"me-2 px-3"}>
                    <img width={20} height={20} src="/wallets/WebLN.png" className="me-2"/>
                    WebLN
                </Button>
            )}
        </>
    );
}

const WebLNConnectedWallet = React.forwardRef<any, any>(({ onClick }, ref) => (
    <div className={"d-flex flex-row align-items-center cursor-pointer"} onClick={onClick}>
        <Icon className="text-success d-flex align-items-center me-1" icon={ic_brightness_1} size={12}/>
        <img width={16} height={16} src="/wallets/WebLN.png" className="me-1"/>
        WebLN
    </div>
));

export function WebLNAnchor(props: {className?: string}) {

    const {isInstalled, lnWallet, connectWallet, setLnWallet} = useWebLNWalletChooser();

    if(!isInstalled && lnWallet==null) return <></>;

    return (
        <>
            {lnWallet==null ? (
                <a className={props.className} href="javascript:void(0);" onClick={() => connectWallet()}>
                    Connect BTC-LN wallet
                </a>
            ) : (
                <Dropdown align={{md: "start"}}>
                    <Dropdown.Toggle as={WebLNConnectedWallet} id="dropdown-custom-components" className={props.className}>
                        Custom toggle
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        <Dropdown.Item eventKey="1" onClick={() => {
                            setLnWallet(null)
                        }}>Disconnect</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            )}
        </>
    );
}