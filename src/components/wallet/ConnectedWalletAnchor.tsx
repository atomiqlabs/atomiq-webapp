import {Button, Dropdown} from "react-bootstrap";
import * as React from "react";
import {ic_brightness_1} from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
import {Token} from "@atomiqlabs/sdk";
import {useWalletForCurrency} from "../../utils/useWalletList";

const ConnectedWallet = React.forwardRef<any, any>(({ name, icon, onClick, noText }, ref) => (
    <div className={"d-flex flex-row align-items-center cursor-pointer"} onClick={onClick}>
        <Icon className="text-success d-flex align-items-center me-1" icon={ic_brightness_1} size={12}/>
        <img width={16} height={16} src={icon} className="me-1"/>
        {!noText ? name : ""}
    </div>
));

export function ConnectedWalletAnchor(props: {
    className?: string,
    noText?: boolean,
    currency: Token
}) {
    const {name, icon, connect, disconnect, changeWallet, chainName} = useWalletForCurrency(props.currency);

    if(name==null && connect==null) return <></>;

    return (
        <>
            {name==null ? (
                <Button
                    variant="outline-light"
                    style={{marginBottom: "2px"}}
                    className="py-0 px-1"
                    onClick={() => connect()}
                >
                    <small className="font-smallest" style={{marginBottom: "-2px"}}>Connect {chainName} wallet</small>
                </Button>
            ) : (
                <Dropdown align={{md: "start"}}>
                    <Dropdown.Toggle as={ConnectedWallet} id="dropdown-custom-components" className={props.className} name={name} icon={icon} noText={props.noText}>
                        Custom toggle
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        <Dropdown.Item eventKey="1" onClick={disconnect}>Disconnect</Dropdown.Item>
                        {changeWallet!=null ? (
                            <Dropdown.Item eventKey="2" onClick={() => {
                                changeWallet();
                            }}>Change wallet</Dropdown.Item>
                        ) : ""}
                    </Dropdown.Menu>
                </Dropdown>
            )}
        </>
    );
}