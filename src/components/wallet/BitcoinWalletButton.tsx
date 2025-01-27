import {Button, CloseButton, Dropdown, ListGroup, Modal} from "react-bootstrap";
import * as React from "react";
import {useContext, useState} from "react";
import {BitcoinWalletContext} from "../../context/BitcoinWalletContext";
import {BitcoinWalletType} from "../../bitcoin/onchain/BitcoinWalletUtils";
import {ic_brightness_1} from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";

export function useBitcoinWalletChooser() {

    const {bitcoinWallet, connect, disconnect, usableWallets} = useContext(BitcoinWalletContext);

    const [loading, setLoading] = useState<boolean>(false);
    const [modalOpened, setModalOpened] = useState<boolean>(false);

    const [error, setError] = useState<string>();


    const connectWallet = (wallet?: BitcoinWalletType) => {
        if(wallet!=null) {
            connect(wallet).then(result => {
                setModalOpened(false);
            }).catch(e => {
                console.error(e);
                setError(e.message);
            });
            return;
        }
        if(usableWallets.length===1) {
            connect(usableWallets[0]).catch(e => {
                console.error(e);
                setError(e.message);
            });
        } else {
            setModalOpened(true);
        }
    };

    return {loading, modalOpened, setModalOpened, usableWallets, bitcoinWallet, connectWallet, disconnect, error};
}

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

const BitcoinConnectedWallet = React.forwardRef<any, any>(({ bitcoinWallet, onClick, noText }, ref) => (
    <div className={"d-flex flex-row align-items-center cursor-pointer"} onClick={onClick}>
        <Icon className="text-success d-flex align-items-center me-1" icon={ic_brightness_1} size={12}/>
        <img width={16} height={16} src={bitcoinWallet.getIcon()} className="me-1"/>
        {!noText ? bitcoinWallet.getName() : ""}
    </div>
));

export function BitcoinWalletAnchor(props: {className?: string, noText?: boolean}) {

    const {loading, modalOpened, setModalOpened, usableWallets, bitcoinWallet, connectWallet, disconnect, error} = useBitcoinWalletChooser();

    if(usableWallets.length===0 && bitcoinWallet==null) return <></>;

    return (
        <>
            <BitcoinWalletModal
                modalOpened={modalOpened}
                setModalOpened={setModalOpened}
                usableWallets={usableWallets}
                connectWallet={connectWallet}
            />

            {bitcoinWallet==null ? (
                <Button
                    variant="outline-light"
                    style={{marginBottom: "2px"}}
                    className="py-0 px-1"
                    onClick={() => connectWallet()}
                >
                    <small className="font-smallest" style={{marginBottom: "-2px"}}>Connect BTC wallet</small>
                </Button>
            ) : (
                <Dropdown align={{md: "start"}}>
                    <Dropdown.Toggle as={BitcoinConnectedWallet} id="dropdown-custom-components" className={props.className} bitcoinWallet={bitcoinWallet} noText={props.noText}>
                        Custom toggle
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        <Dropdown.Item eventKey="1" onClick={disconnect}>Disconnect</Dropdown.Item>
                        {usableWallets!=null && usableWallets.length>1 ? (
                            <Dropdown.Item eventKey="2" onClick={() => {
                                connectWallet();
                            }}>Change wallet</Dropdown.Item>
                        ) : ""}
                    </Dropdown.Menu>
                </Dropdown>
            )}

            {/*{error!=null ? (*/}
                {/*<Alert>{error}</Alert>*/}
            {/*) : ""}*/}
        </>
    );
}