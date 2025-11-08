import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';
export function LightningHyperlinkModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    return (_jsxs(GenericModal, { visible: openAppModalOpened, size: "sm", type: "notice", icon: "Notice", onClose: () => setOpenAppModalOpened(false), title: "Important notice", enableClose: true, children: [_jsxs("p", { className: "sc-text", children: ["The payment will not succeed unless you", ' ', _jsx("strong", { children: "return to the web app and claim the swap." })] }), _jsx(ValidatedInput, { type: "checkbox", placeholder: "Don't show this warning again", onChange: (checked) => props.setShowHyperlinkWarning(!checked) }), _jsx(BaseButton, { variant: "secondary", className: "sc-button", onClick: () => {
                    window.location.href = props.hyperlink;
                    setOpenAppModalOpened(false);
                }, children: "Understood, pay with LN wallet" })] }));
}
