import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import QrScanner from 'qr-scanner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
export function QRScanner(props) {
    const videoRef = useRef(null);
    const callbackRef = useRef(null);
    const qrScannerRef = useRef(null);
    const [error, setError] = useState();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        callbackRef.current = props.onResult;
    }, [props.onResult]);
    useEffect(() => {
        if (props.onLoadingChange) {
            props.onLoadingChange(loading);
        }
    }, [loading, props.onLoadingChange]);
    const startCamera = useCallback(() => {
        setLoading(true);
        if (qrScannerRef.current != null)
            qrScannerRef.current.stop();
        qrScannerRef.current = new QrScanner(videoRef.current, (result) => callbackRef.current(result.data, null), {
            preferredCamera: props.camera,
            highlightScanRegion: true,
            highlightCodeOutline: false,
            returnDetailedScanResult: true,
        });
        qrScannerRef.current
            .start()
            .then(() => {
            setLoading(false);
        })
            .catch((err) => {
            console.error(err);
            setError(err);
            setLoading(false);
        });
    }, [props.camera]);
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
    }, [startCamera]);
    return (_jsxs(_Fragment, { children: [_jsxs(GenericModal, { visible: !!error, onClose: () => setError(null), title: "Camera error", size: "sm", icon: "invalid-error", type: "warning", children: [_jsxs("p", { children: ["atomiq.exchange cannot access your camera, please make sure you've", ' ', _jsx("b", { children: "allowed camera access permission" }), " to your wallet app & to atomiq.exchange website."] }), _jsxs("div", { className: "generic-modal__buttons", children: [_jsx(BaseButton, { variant: "primary", className: "width-fill", onClick: () => {
                                    setError(null);
                                    startCamera();
                                }, children: "Retry" }), _jsx(BaseButton, { variant: "secondary", className: "width-fill", onClick: () => setError(null), children: "Cancel" })] })] }), _jsx("video", { ref: videoRef, className: "qr-video", style: { height: '100%' } })] }));
}
