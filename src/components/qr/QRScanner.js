import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import QrScanner from 'qr-scanner';
import { useEffect, useRef, useState } from "react";
import Icon from "react-icons-kit";
import { info } from "react-icons-kit/fa/info";
import { Button, CloseButton, Modal } from "react-bootstrap";
export function QRScanner(props) {
    const videoRef = useRef(null);
    const callbackRef = useRef(null);
    const qrScannerRef = useRef(null);
    const [error, setError] = useState();
    useEffect(() => {
        callbackRef.current = props.onResult;
    }, [props.onResult]);
    const startCamera = () => {
        if (qrScannerRef.current != null)
            qrScannerRef.current.stop();
        qrScannerRef.current = new QrScanner(videoRef.current, result => callbackRef.current(result.data, null), {
            preferredCamera: props.camera,
            highlightScanRegion: true,
            highlightCodeOutline: false,
            returnDetailedScanResult: true
        });
        qrScannerRef.current.start().then(() => {
            //camera started
        }).catch((err) => {
            console.error(err);
            if (props.onError != null) {
                props.onError(err);
            }
            else {
                setError(err);
            }
        });
    };
    useEffect(() => {
        return () => {
            if (qrScannerRef.current != null) {
                qrScannerRef.current.stop();
                qrScannerRef.current = null;
            }
        };
    }, []);
    useEffect(() => {
        startCamera();
    }, [props.camera]);
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: !!error, onHide: () => setError(null), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Camera error", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setError(null) })] }) }), _jsx(Modal.Body, { children: _jsxs("p", { children: ["atomiq.exchange cannot access your camera, please make sure you've ", _jsx("b", { children: "allowed camera access permission" }), " to your wallet app & to atomiq.exchange website."] }) }), _jsxs(Modal.Footer, { className: "border-0 d-flex flex-column", children: [_jsx(Button, { variant: "primary", className: "flex-grow-1 width-fill", onClick: () => {
                                    setError(null);
                                    startCamera();
                                }, children: "Retry" }), _jsx(Button, { variant: "light", className: "flex-grow-1 width-fill", onClick: () => setError(null), children: "Cancel" })] })] }), _jsx("video", { ref: videoRef, className: "qr-video", style: {
                    //width: "100%",
                    height: "100%"
                } })] }));
}
