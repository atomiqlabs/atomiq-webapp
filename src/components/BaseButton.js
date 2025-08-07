import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Spinner } from 'react-bootstrap';
import * as React from 'react';
import classNames from 'classnames';
export const BaseButton = React.forwardRef(function BaseButton({ children, className, onClick, size = 'small', variant = 'primary', disabled = false, isLoading = false, loadingText = 'Loading...', icon, }, ref) {
    const btnClass = classNames('base-button', {
        'base-button--smaller': size === 'smaller',
        'base-button--small': size === 'small',
        'base-button--large': size === 'large',
        'base-button--primary': variant === 'primary',
        'base-button--secondary': variant === 'secondary',
        'base-button--transparent': variant === 'transparent',
        'base-button--clear': variant === 'clear',
        'base-button--icon-only': !children,
    }, className);
    return (_jsx(Button, { ref: ref, className: btnClass, onClick: onClick, variant: variant, disabled: disabled || isLoading, children: isLoading ? (_jsxs(_Fragment, { children: [loadingText, _jsx(Spinner, { as: "span", animation: "border", size: "sm", role: "status", "aria-hidden": "true", className: "me-2" })] })) : (_jsxs(_Fragment, { children: [icon && _jsx("div", { className: "base-button__icon", children: icon }), _jsx("div", { className: "base-button__content", children: children })] })) }));
});
