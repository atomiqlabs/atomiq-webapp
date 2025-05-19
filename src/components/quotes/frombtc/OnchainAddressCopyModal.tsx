import * as React from "react";
import {
    Button,
    CloseButton,
    Modal
} from "react-bootstrap";
import Icon from "react-icons-kit";
import {info} from 'react-icons-kit/fa/info';
import {useState} from "react";
import ValidatedInput from "../../ValidatedInput";

export function OnchainAddressCopyModal(props: {
    openRef: React.MutableRefObject<() => void>,
    amountBtc: string,
    setShowCopyWarning: (value: boolean) => void
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
                <p>Please make sure you send <b><u>EXACTLY</u> {props.amountBtc} BTC</b>, sending different amount
                    will not be accepted and you might loose funds!</p>
                <ValidatedInput
                    type="checkbox"
                    placeholder="Don't show this warning again"
                    onChange={(checked: boolean) => props.setShowCopyWarning(!checked)}
                />
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex">
            <Button variant="primary" className="flex-grow-1" onClick={() => {
                    setOpenAppModalOpened(false);
                }}>
                    Understood, copy address
                </Button>
            </Modal.Footer>
        </Modal>
    )
}