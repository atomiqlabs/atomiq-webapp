import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AlertMessage(props) {
    const classNames = ['alert-message', `is-${props.variant}`, props.className]
        .filter(Boolean)
        .join(' ');
    const iconMap = {
        success: 'check-circle',
        warning: 'Notice',
        danger: 'invalid-error',
        info: 'info',
    };
    const iconClass = iconMap[props.variant];
    return (_jsxs("div", { className: classNames, children: [_jsx("i", { className: `alert-message__icon icon icon-${iconClass}` }), _jsx("div", { className: "alert-message__body", children: props.children })] }));
}
