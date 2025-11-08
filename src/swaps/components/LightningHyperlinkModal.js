import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';
export function LightningHyperlinkModal(props) {
    return (_jsxs(GenericModal, { visible: props.opened, size: "sm", type: "notice", icon: "Notice", onClose: () => props.close(false), title: "Important notice", enableClose: true, children: [_jsxs("p", { className: "sc-text", children: ["The payment will not succeed unless you", ' ', _jsx("strong", { children: "return to the web app and claim the swap." })] }), _jsx(ValidatedInput, { type: "checkbox", placeholder: "Don't show this warning again", onChange: (checked) => props.setShowHyperlinkWarning(!checked) }), _jsx(BaseButton, { variant: "secondary", className: "sc-button", onClick: () => props.close(true), children: "Understood, pay with LN wallet" })] }));
}
