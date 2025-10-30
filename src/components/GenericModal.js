import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
export const GenericModal = ({ className = '', container = 'body', visible, onClose, title, children, size = 'md', icon, enableClose = true, }) => {
    const ref = useRef(null);
    const [fadeIn, setFadeIn] = useState(false);
    const [portal, setPortal] = useState(null);
    const hideModal = useCallback(() => {
        setFadeIn(false);
        setTimeout(() => onClose(), 150);
    }, [onClose]);
    const handleClose = useCallback((event) => {
        if (!enableClose)
            return;
        event.preventDefault();
        hideModal();
    }, [hideModal, enableClose]);
    const handleTabKey = useCallback((event) => {
        const node = ref.current;
        if (!node)
            return;
        // here we query all focusable elements
        const focusableElements = node.querySelectorAll('button');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstElement = focusableElements[0];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey) {
            // if going backward by pressing tab and firstElement is active, shift focus to last focusable element
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        }
        else {
            // if going forward by pressing tab and lastElement is active, shift focus to first focusable element
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }, [ref]);
    useLayoutEffect(() => {
        if (!visible)
            return;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'Esc') {
                if (!enableClose)
                    return;
                event.stopPropagation();
                event.preventDefault();
                hideModal();
            }
            else if (event.key === 'Tab') {
                handleTabKey(event);
            }
        };
        // Get original overflow
        const { overflow } = window.getComputedStyle(document.body);
        // Hack to enable fade in animation after mount
        setTimeout(() => setFadeIn(true), 0);
        // Prevent scrolling on mount
        document.body.style.overflow = 'hidden';
        // Listen for keydown events
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            // Re-enable scrolling when component unmounts
            document.body.style.overflow = overflow;
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [visible, hideModal, handleTabKey, enableClose]);
    useLayoutEffect(() => setPortal(document.querySelector(container)), [container]);
    if (!visible)
        return null;
    return (portal &&
        createPortal(_jsxs("div", { "aria-labelledby": "generic-modal-title", "aria-modal": "true", className: `generic-modal ${fadeIn && 'generic-modal-fade-in'} generic-modal--${size} ${className}`, ref: ref, role: "dialog", children: [_jsx("div", { className: "generic-modal-container", children: _jsxs("div", { className: "generic-modal-wrapper", children: [enableClose && (_jsx("button", { onClick: handleClose, className: "generic-modal-button-close", children: _jsx("svg", { width: "14", height: "14", children: _jsx("path", { d: "M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" }) }) })), icon && _jsx("div", { className: `generic-modal-icon icon icon-${icon}` }), _jsx("h1", { className: "generic-modal-title", id: "generic-modal-title", children: title }), children] }) }), _jsx("div", { className: "generic-modal-overlay", onMouseDown: handleClose })] }), portal));
};
