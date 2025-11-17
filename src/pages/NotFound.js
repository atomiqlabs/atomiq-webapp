import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { BaseButton } from '../components/common/BaseButton';
export function NotFound() {
    const navigate = useNavigate();
    return (_jsx("div", { className: "flex-fill text-white container text-center d-flex align-items-center justify-content-center", children: _jsxs("div", { className: "px-5 py-5 d-flex flex-column align-items-center", children: [_jsx("h1", { className: "display-1", children: "404" }), _jsx("h3", { className: "mb-4", children: "Page Not Found" }), _jsx("p", { className: "mb-4", children: "The page you are looking for doesn't exist or has been moved." }), _jsx(BaseButton, { variant: "primary", onClick: () => navigate('/'), children: "Go to Home" })] }) }));
}
