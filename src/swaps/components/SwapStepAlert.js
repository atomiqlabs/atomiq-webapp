import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_content_copy } from 'react-icons-kit/md/ic_content_copy';
import { BaseButton } from '../../components/BaseButton';
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
        if (props.onCopyError) {
            props.onCopyError();
        }
    };
    // Handle show prop for conditional rendering
    if (props.show === false) {
        return null;
    }
    const classNames = [
        'swap-step-alert',
        `is-${props.type}`,
        !props.icon && 'no-icon',
        props.className,
    ]
        .filter(Boolean)
        .join(' ');
    return (_jsxs("div", { className: classNames, children: [props.icon && (_jsx("div", { className: "swap-step-alert__icon", children: _jsx(Icon, { size: 20, icon: props.icon }) })), _jsxs("strong", { className: "swap-step-alert__title", children: [props.title, props.error && (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-error-tooltip", children: "Copy full error stack" }), children: _jsx("a", { href: "#", className: "swap-step-alert__copy d-inline-flex align-items-center justify-content-middle", onClick: handleCopyError, children: _jsx(Icon, { className: "ms-1 mb-1", size: 16, icon: ic_content_copy }) }) }))] }), _jsx("label", { className: "swap-step-alert__description", children: props.description }), props.action && (_jsx(_Fragment, { children: props.action.type === 'link' ? (_jsxs("a", { href: props.action.href, target: "_blank", rel: "noopener noreferrer", className: "swap-step-alert__action", onClick: props.action.onClick, children: [_jsx("div", { className: "sc-text", children: props.action.text }), props.action.icon || _jsx("div", { className: "icon icon-new-window" })] })) : (_jsx(BaseButton, { variant: props.action.variant || 'secondary', className: "swap-step-alert__button", icon: props.action.icon, onClick: props.action.onClick, children: props.action.text })) }))] }));
}
