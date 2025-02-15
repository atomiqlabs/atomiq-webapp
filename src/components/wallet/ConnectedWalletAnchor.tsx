import {Button, CloseButton, Dropdown, ListGroup, Modal} from "react-bootstrap";
import * as React from "react";
import {BitcoinWalletType} from "../../bitcoin/onchain/BitcoinWalletUtils";
import {ic_brightness_1} from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
import {Token} from "@atomiqlabs/sdk";
import {useWalletForCurrency} from "../../utils/useWalletList";

export function BitcoinWalletModal(props: {
    modalOpened: boolean,
    setModalOpened: (opened: boolean) => void,
    connectWallet: (wallet?: BitcoinWalletType) => void,
    usableWallets: BitcoinWalletType[]
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
                    {props.usableWallets.map((e, index) => {
                        return (
                            <ListGroup.Item action key={e.name} onClick={() => props.connectWallet(e)} className="d-flex flex-row bg-transparent text-white border-0">
                                <img width={20} height={20} src={e.iconUrl} className="me-2"/>
                                <span>{e.name}</span>
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            </Modal.Body>
        </Modal>
    )
}

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