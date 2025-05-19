import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QRScanner } from "./QRScanner";
import { Button, CloseButton, Modal } from "react-bootstrap";
import { useState } from "react";
import Icon from "react-icons-kit";
import { info } from "react-icons-kit/fa/info";
export function QRScannerModal(props) {
    const [error, setError] = useState();
    if (error) {
        return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: !!error && props.show, onHide: () => {
                props.onHide();
                setError(null);
            }, dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Camera error", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => {
                                    props.onHide();
                                    setError(null);
                                } })] }) }), _jsx(Modal.Body, { children: _jsxs("p", { children: ["atomiq.exchange cannot access your camera, please make sure you've ", _jsx("b", { children: "allowed camera access permission" }), " to your wallet app & to atomiq.exchange website."] }) }), _jsxs(Modal.Footer, { className: "border-0 d-flex flex-column", children: [_jsx(Button, { variant: "primary", className: "flex-grow-1 width-fill", onClick: () => {
                                setError(null);
                            }, children: "Retry" }), _jsx(Button, { variant: "light", className: "flex-grow-1 width-fill", onClick: () => {
                                props.onHide();
                                setError(null);
                            }, children: "Cancel" })] })] }));
    }
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "lg", centered: true, show: props.show, onHide: props.onHide, children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: ["Scan QR code", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: props.onHide })] }) }), _jsx(Modal.Body, { children: _jsx(QRScanner, { onResult: (result, err) => {
                        if (result != null) {
                            if (props.onScanned != null) {
                                props.onScanned(result);
                            }
                        }
                    }, camera: "environment", onError: setError }) })] }));
}
