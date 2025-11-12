import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
//TODO: Deprecated, no need to have separate component for this, just define
// a mapping between chainId and auditor logos in FEConstants & move this
// directly to SwapNew
export function AuditedBy(props) {
    const navigate = useNavigate();
    return (_jsx("div", { className: "vetified-by text-light d-flex flex-row align-items-center justify-content-center mb-5", children: _jsxs("div", { className: "cursor-pointer d-flex align-items-center justify-content-center", onClick: () => navigate('/faq?tabOpen=6'), children: [_jsx("div", { className: "icon icon-verified" }), _jsx("span", { className: "vetified-by__text", children: "Audited by" }), props.chainId === 'STARKNET' ? (_jsx("img", { src: "/csc-white-logo.png", style: { marginTop: '-0.075rem' } })) : (_jsx("img", { src: "/ackee_logo.svg", style: { marginTop: '-0.125rem' } }))] }) }));
}
