import QrScanner from 'qr-scanner';
import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import Icon from "react-icons-kit";
import {info} from "react-icons-kit/fa/info";
import {Button, CloseButton, Modal} from "react-bootstrap";


export function QRScanner(props: {
    onResult: (data: string, err) => void,
    camera: "user" | "environment"
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const callbackRef = useRef<(data: string, err) => void>(null);
    const qrScannerRef = useRef<QrScanner>(null);

    const [error, setError] = useState<Error>();

    useEffect(() => {
        callbackRef.current = props.onResult;
    }, [props.onResult]);

    const startCamera = useCallback(() => {
        if(qrScannerRef.current!=null) qrScannerRef.current.stop();
        qrScannerRef.current = new QrScanner(
            videoRef.current,
            result => callbackRef.current(result.data, null),
            {
                preferredCamera: props.camera,
                highlightScanRegion: true,
                highlightCodeOutline: false,
                returnDetailedScanResult: true
            },
        );

        qrScannerRef.current.start().then(() => {
            //camera started
        }).catch((err) => {
            console.error(err);
            setError(err);
        });
    }, []);

    useEffect(() => {
        return () => {
            if(qrScannerRef.current!=null) {
                qrScannerRef.current.stop();
                qrScannerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        startCamera();
    }, [props.camera]);

    return (
        <>
            <Modal contentClassName="text-white bg-dark" size="sm" centered show={!!error} onHide={() => setError(null)} dialogClassName="min-width-400px">
                <Modal.Header className="border-0">
                    <Modal.Title id="contained-modal-title-vcenter" className="d-flex flex-grow-1">
                        <Icon icon={info} className="d-flex align-items-center me-2"/> Camera error
                        <CloseButton className="ms-auto" variant="white" onClick={() => setError(null)}/>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>atomiq.exchange cannot access your camera, please make sure you've <b>allowed camera access permission</b> to your wallet app & to atomiq.exchange website.</p>
                </Modal.Body>
                <Modal.Footer className="border-0 d-flex flex-column">
                    <Button variant="primary" className="flex-grow-1 width-fill" onClick={() => {
                        setError(null);
                        startCamera();
                    }}>
                        Retry
                    </Button>
                    <Button variant="light" className="flex-grow-1 width-fill" onClick={() => setError(null)}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
            <video ref={videoRef} className="qr-video" style={{height: "100%"}}/>
        </>
    );
}