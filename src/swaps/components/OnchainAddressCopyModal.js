import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, CloseButton, Modal } from "react-bootstrap";
import Icon from "react-icons-kit";
import { info } from "react-icons-kit/fa/info";
import { useState } from "react";
import ValidatedInput from "../../components/ValidatedInput";
export function OnchainAddressCopyModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: openAppModalOpened, onHide: () => setOpenAppModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " ", "Important notice", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setOpenAppModalOpened(false) })] }) }), _jsxs(Modal.Body, { children: [_jsxs("p", { children: ["Please make sure you send", " ", _jsxs("b", { children: [_jsx("u", { children: "EXACTLY" }), " ", props.amountBtc, " BTC"] }), ", sending different amount will not be accepted and you might loose funds!"] }), _jsx(ValidatedInput, { type: "checkbox", placeholder: "Don't show this warning again", onChange: (checked) => props.setShowCopyWarning(!checked) })] }), _jsx(Modal.Footer, { className: "border-0 d-flex", children: _jsx(Button, { variant: "primary", className: "flex-grow-1", onClick: () => {
                        setOpenAppModalOpened(false);
                    }, children: "Understood, copy address" }) })] }));
}
