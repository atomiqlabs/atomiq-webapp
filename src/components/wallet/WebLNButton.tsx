import {Button, Dropdown} from "react-bootstrap";
import * as React from "react";
import {useContext} from "react";
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

const WebLNConnectedWallet = React.forwardRef<any, any>(({ onClick, noText }, ref) => (
    <div className={"d-flex flex-row align-items-center cursor-pointer"} onClick={onClick}>
        <Icon className="text-success d-flex align-items-center me-1" icon={ic_brightness_1} size={12}/>
        <img width={16} height={16} src="/wallets/WebLN.png" className="me-1"/>
        {!noText ? "WebLN" : ""}
    </div>
));

export function WebLNAnchor(props: {className?: string, noText?: boolean}) {

    const {isInstalled, lnWallet, connectWallet, setLnWallet} = useWebLNWalletChooser();

    if(!isInstalled && lnWallet==null) return <></>;

    return (
        <>
            {lnWallet==null ? (
                <Button
                    variant="outline-light"
                    style={{marginBottom: "2px"}}
                    className="py-0 px-1"
                    onClick={() => connectWallet()}
                >
                    <small className="font-smallest" style={{marginBottom: "-2px"}}>Connect BTC-LN wallet</small>
                </Button>
            ) : (
                <Dropdown align={{md: "start"}}>
                    <Dropdown.Toggle as={WebLNConnectedWallet} id="dropdown-custom-components" className={props.className} noText={props.noText}>
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