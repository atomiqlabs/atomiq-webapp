import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QRScanner } from "./QRScanner";
import { CloseButton, Modal } from "react-bootstrap";
export function QRScannerModal(props) {
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "lg", centered: true, show: props.show, onHide: props.onHide, children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: ["Scan QR code", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: props.onHide })] }) }), _jsx(Modal.Body, { children: _jsx(QRScanner, { onResult: (result, err) => {
                        if (result != null) {
                            if (props.onScanned != null) {
                                props.onScanned(result);
                            }
                        }
                    }, camera: "environment" }) })] }));
}
