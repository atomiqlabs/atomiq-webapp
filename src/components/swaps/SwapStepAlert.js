import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_content_copy } from 'react-icons-kit/md/ic_content_copy';
import { BaseButton } from '../common/BaseButton';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_info } from 'react-icons-kit/md/ic_info';
import { ic_error } from 'react-icons-kit/md/ic_error';
const DefaultIcons = {
    success: ic_check_circle,
    error: ic_warning,
    warning: ic_warning,
    info: ic_info,
    danger: ic_error,
};
export function SwapStepAlert(props) {
    const handleCopyError = (event) => {
        event.preventDefault();
        if (props.error) {
            // @ts-ignore
            navigator.clipboard.writeText(JSON.stringify({
                error: props.error.name,
                message: props.error.message,
                stack: props.error.stack,
            }, null, 4));
        }
    };
    // Handle show prop for conditional rendering
    if (props.show === false) {
        return null;
    }
    const icon = props.icon === null ? undefined : (props.icon ?? DefaultIcons[props.type]);
    const classNames = ['swap-step-alert', `is-${props.type}`, !icon && 'no-icon', props.className]
        .filter(Boolean)
        .join(' ');
    const description = props.description ?? props.error?.message ?? props.error?.toString();
    return (_jsxs("div", { className: classNames, children: [!!icon && (_jsx("div", { className: "swap-step-alert__icon", children: _jsx(Icon, { size: 20, icon: icon }) })), _jsxs("strong", { className: "swap-step-alert__title", children: [props.title, props.error && (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-error-tooltip", children: "Copy full error stack" }), children: _jsx("a", { href: "#", className: "swap-step-alert__copy d-inline-flex align-items-center justify-content-middle", onClick: handleCopyError, children: _jsx(Icon, { className: "ms-1 mb-1", size: 16, icon: ic_content_copy }) }) }))] }), description && _jsx("label", { className: "swap-step-alert__description", children: description }), props.action && (_jsx(_Fragment, { children: props.action.type === 'link' ? (_jsxs("a", { href: props.action.href, target: "_blank", rel: "noopener noreferrer", className: "swap-step-alert__action", onClick: props.action.onClick, children: [_jsx("div", { className: "sc-text", children: props.action.text }), props.action.icon || _jsx("div", { className: "icon icon-new-window" })] })) : (_jsx(BaseButton, { variant: props.action.variant || 'secondary', className: "swap-step-alert__button", icon: props.action.icon, onClick: props.action.onClick, children: props.action.text })) })), props.actionElement ?? null] }));
}
