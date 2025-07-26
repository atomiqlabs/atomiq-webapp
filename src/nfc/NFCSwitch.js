import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { NFCReader, NFCStartResult } from "./NFCReader";
import Icon from "react-icons-kit";
import { Form } from "react-bootstrap";
import { ic_contactless } from "react-icons-kit/md/ic_contactless";
export function NFCSwitch() {
    const [nfcSupported, setNfcSupported] = useState(false);
    const [nfcEnabled, setNfcEnabled] = useState(true);
    useEffect(() => {
        setNfcSupported(NFCReader.isSupported());
        setNfcEnabled(!NFCReader.isUserDisabled());
    }, []);
    const nfcSet = (val, target) => {
        if (val === true) {
            const reader = new NFCReader();
            reader.start(true).then((resp) => {
                if (resp === NFCStartResult.OK) {
                    setNfcEnabled(true);
                    target.checked = true;
                    reader.stop();
                }
            });
        }
        if (val === false) {
            setNfcEnabled(false);
            target.checked = false;
            NFCReader.userDisable();
        }
    };
    if (nfcSupported)
        return (_jsxs("div", { className: "nav-link d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: ic_contactless, className: "d-flex me-1" }), _jsx("label", { title: "", htmlFor: "nfc", className: "form-check-label me-2", children: "NFC enable" }), _jsx(Form.Check // prettier-ignore
                , { id: "nfc", type: "switch", onChange: (val) => nfcSet(val.target.checked, val.target), checked: nfcEnabled })] }));
    return null;
}
