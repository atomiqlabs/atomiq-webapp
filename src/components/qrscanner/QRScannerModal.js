import { jsx as _jsx } from "react/jsx-runtime";
import { QRScanner } from './QRScanner';
import { GenericModal } from '../common/GenericModal';
export function QRScannerModal(props) {
    return (_jsx(GenericModal, { visible: props.show, onClose: props.onHide, title: "Scan QR code", children: _jsx(QRScanner, { onResult: (result, err) => {
                if (result != null) {
                    if (props.onScanned != null) {
                        props.onScanned(result);
                    }
                }
            }, camera: 'environment' }) }));
}
