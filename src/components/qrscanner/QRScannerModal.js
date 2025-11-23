import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QRScanner } from './QRScanner';
import { useEffect, useState } from 'react';
import { GenericModal } from '../common/GenericModal';
import { Spinner } from 'react-bootstrap';
export function QRScannerModal(props) {
    const [loading, setLoading] = useState(true);
    // Reset loading state when modal is opened
    useEffect(() => {
        if (props.show) {
            setLoading(true);
        }
    }, [props.show]);
    return (_jsxs(GenericModal, { visible: props.show, onClose: props.onHide, title: "Scan QR code", children: [loading && (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '200px' }, children: _jsx(Spinner, { animation: "border", role: "status", variant: "light", children: _jsx("span", { className: "visually-hidden", children: "Loading camera..." }) }) })), _jsx("div", { style: { display: loading ? 'none' : 'block' }, children: _jsx(QRScanner, { onResult: (result, err) => {
                        if (result != null) {
                            if (props.onScanned != null) {
                                props.onScanned(result);
                            }
                        }
                    }, camera: 'environment', onLoadingChange: setLoading }) })] }));
}
