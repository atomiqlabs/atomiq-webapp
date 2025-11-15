import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
import ValidatedInput from '../ValidatedInput';
export function ImportantNoticeModal(props) {
    return (_jsxs(GenericModal, { visible: props.opened, size: "sm", type: "notice", icon: "Notice", onClose: () => props.close(false), title: "Important notice", enableClose: true, children: [_jsx("p", { className: "sc-text", children: props.text }), _jsx(ValidatedInput, { type: "checkbox", placeholder: "Don't show this warning again", onChange: (checked) => props.setShowAgain(!checked) }), _jsx(BaseButton, { variant: "secondary", className: "sc-button", onClick: () => props.close(true), children: props.buttonText })] }));
}
