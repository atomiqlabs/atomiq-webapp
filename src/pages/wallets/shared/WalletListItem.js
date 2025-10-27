import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const WalletListItem = ({ name, icon, isInstalled, onClick, tabIndex = 0 }) => {
    return (_jsx("li", { children: _jsxs("button", { className: "wallet-modal__item", onClick: onClick, tabIndex: tabIndex, children: [typeof icon === 'string' ? (_jsx("img", { width: 20, height: 20, src: icon, className: "wallet-modal__item__icon", alt: `${name} icon` })) : (_jsx("div", { className: "wallet-modal__item__icon", children: icon })), !isInstalled && 'Install ', name, isInstalled && _jsx("div", { className: "wallet-modal__item__status", children: "Installed" })] }) }));
};
