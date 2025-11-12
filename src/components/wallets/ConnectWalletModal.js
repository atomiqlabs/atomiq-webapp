import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WalletModal } from './WalletModal';
export const WalletListItem = ({ name, icon, isInstalled, onClick, tabIndex = 0, }) => {
    return (_jsx("li", { children: _jsxs("button", { className: "wallet-modal__item", onClick: onClick, tabIndex: tabIndex, children: [typeof icon === 'string' ? (_jsx("img", { width: 20, height: 20, src: icon, className: "wallet-modal__item__icon", alt: `${name} icon` })) : (_jsx("div", { className: "wallet-modal__item__icon", children: icon })), !isInstalled && 'Install ', name, isInstalled && _jsx("div", { className: "wallet-modal__item__status", children: "Installed" })] }) }));
};
export const ConnectWalletModal = ({ visible, onClose, title, installedWallets, notInstalledWallets = [], onWalletClick, className = '', container = 'body', }) => {
    return (_jsxs(WalletModal, { className: className, container: container, visible: visible, onClose: onClose, title: title, children: [installedWallets.length > 0 && (_jsx("ul", { className: "wallet-adapter-modal-list", children: installedWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.name, icon: wallet.icon, isInstalled: true, onClick: (event) => onWalletClick(wallet, event) }, wallet.name))) })), notInstalledWallets.length > 0 && (_jsx("ul", { className: "wallet-adapter-modal-list", children: notInstalledWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.name, icon: wallet.icon, isInstalled: false, onClick: () => {
                        window.location.href = wallet.downloadLink;
                    } }, wallet.name))) }))] }));
};
