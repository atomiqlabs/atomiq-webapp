import * as React from "react";
import {
    Button,
    CloseButton,
    Modal
} from "react-bootstrap";
import Icon from "react-icons-kit";
import {info} from 'react-icons-kit/fa/info';
import {useState} from "react";

export function LightningHyperlinkModal(props: {
    openRef: React.MutableRefObject<() => void>,
    hyperlink: string
}) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);

    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };

    return (
        <Modal contentClassName="text-white bg-dark" size="sm" centered show={openAppModalOpened} onHide={() => setOpenAppModalOpened(false)} dialogClassName="min-width-400px">
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    <Icon icon={info} className="d-flex align-items-center me-2"/> Important notice
                    <CloseButton className="ms-auto" variant="white" onClick={() => setOpenAppModalOpened(false)}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Please make sure that you return back to this dApp once you inititated a Lightning Network payment from your wallet app. <b>The Lightning Network payment will only succeed/confirm once you come back to the dApp and claim the funds on the Solana side!</b></p>
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex">
                <Button variant="primary" className="flex-grow-1" onClick={() => {
                    window.location.href = props.hyperlink;
                    setOpenAppModalOpened(false);
                }}>
                    Understood, continue
                </Button>
            </Modal.Footer>
        </Modal>
    )
}