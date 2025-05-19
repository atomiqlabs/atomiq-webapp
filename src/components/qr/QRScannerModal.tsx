import {QRScanner} from "./QRScanner";
import * as React from "react";
import {Button, CloseButton, Modal} from "react-bootstrap";
import {useState} from "react";
import Icon from "react-icons-kit";
import {info} from "react-icons-kit/fa/info";


export function QRScannerModal(props: {
    onScanned: (value: string) => void,
    show: boolean,
    onHide: () => void
}) {
    const [error, setError] = useState<Error>();

    if(error) {
        return (
            <Modal contentClassName="text-white bg-dark" size="sm" centered show={!!error && props.show} onHide={() => {
                props.onHide();
                setError(null);
            }} dialogClassName="min-width-400px">
                <Modal.Header className="border-0">
                    <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                        <Icon icon={info} className="d-flex align-items-center me-2"/> Camera error
                        <CloseButton className="ms-auto" variant="white" onClick={() => {
                            props.onHide();
                            setError(null);
                        }}/>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>atomiq.exchange cannot access your camera, please make sure you've <b>allowed camera access permission</b> to your wallet app & to atomiq.exchange website.</p>
                </Modal.Body>
                <Modal.Footer className="border-0 d-flex flex-column">
                    <Button variant="primary" className="flex-grow-1 width-fill" onClick={() => {
                        setError(null);
                    }}>
                        Retry
                    </Button>
                    <Button variant="light" className="flex-grow-1 width-fill" onClick={() => {
                        props.onHide();
                        setError(null)
                    }}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    return (
        <Modal contentClassName="text-white bg-dark" size="lg" centered show={props.show} onHide={props.onHide}>
            <Modal.Header className="border-0">
                <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                    Scan QR code
                    <CloseButton className="ms-auto" variant="white" onClick={props.onHide}/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <QRScanner onResult={(result, err) => {
                    if(result!=null) {
                        if(props.onScanned!=null) {
                            props.onScanned(result);
                        }
                    }
                }} camera={"environment"} onError={setError}/>
            </Modal.Body>
        </Modal>
    )
}