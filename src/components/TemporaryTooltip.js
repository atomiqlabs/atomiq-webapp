import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Overlay, Tooltip } from 'react-bootstrap';
import { useCallback, useEffect, useState } from 'react';
export function TemporaryTooltip(props) {
    const [showCopyOverlay, setShowCopyOverlay] = useState(null);
    useEffect(() => {
        if (showCopyOverlay == null)
            return;
        const timeout = setTimeout(() => {
            setShowCopyOverlay(null);
        }, props.timeout ?? 2000);
        return () => {
            clearTimeout(timeout);
        };
    }, [showCopyOverlay]);
    const show = useCallback((target) => {
        setShowCopyOverlay(target);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(Overlay, { target: showCopyOverlay, show: showCopyOverlay != null, placement: props.placement, children: (_props) => (_jsx(Tooltip, { id: "overlay-example", ..._props, children: props.text })) }), props.children(show)] }));
}
