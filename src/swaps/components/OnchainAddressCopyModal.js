import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';
export function OnchainAddressCopyModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    return (_jsxs(GenericModal, { visible: openAppModalOpened, size: "sm", className: "onchain-address-copy-modal", icon: "Notice", type: "notice", onClose: () => setOpenAppModalOpened(false), title: "Important notice", enableClose: false, children: [_jsxs("p", { className: "sc-text", children: ["Make sure you send ", _jsxs("b", { children: ["EXACTLY ", props.amountBtc, " BTC"] }), ", as sending a different amount will not be accepted, and you might lose your funds!"] }), _jsx(ValidatedInput, { type: "checkbox", placeholder: "Don't show this warning again", onChange: (checked) => props.setShowCopyWarning(!checked) }), _jsx(BaseButton, { variant: "secondary", className: "sc-button", onClick: () => {
                    setOpenAppModalOpened(false);
                }, children: "Understood, copy address" })] }));
}
