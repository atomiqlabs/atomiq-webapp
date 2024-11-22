import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import Icon from "react-icons-kit";
import { ic_content_copy } from "react-icons-kit/md/ic_content_copy";
export function ErrorAlert(props) {
    return (_jsxs(Alert, { className: "text-center", show: props.error != null, variant: "danger", onClose: props.clearError, children: [_jsxs("div", { className: "d-flex align-items-center justify-content-center", children: [_jsx("strong", { children: "Quoting error" }), _jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Copy full error stack" }), children: _jsx("a", { href: "#", className: "d-inline-flex align-items-center justify-content-middle", onClick: (evnt) => {
                                evnt.preventDefault();
                                // @ts-ignore
                                navigator.clipboard.writeText(JSON.stringify({
                                    error: props.error.name,
                                    message: props.error.message,
                                    stack: props.error.stack
                                }, null, 4));
                            }, children: _jsx(Icon, { className: "ms-1 mb-1", size: 16, icon: ic_content_copy }) }) })] }), _jsx("label", { children: props.error?.message || props.error?.toString() })] }));
}
