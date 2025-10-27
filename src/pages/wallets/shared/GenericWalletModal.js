import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WalletModal } from './WalletModal';
import { WalletListItem } from './WalletListItem';
export const GenericWalletModal = ({ visible, onClose, title, installedWallets, notInstalledWallets = [], onWalletClick, className = '', container = 'body', }) => {
    return (_jsxs(WalletModal, { className: className, container: container, visible: visible, onClose: onClose, title: title, children: [installedWallets.length > 0 && (_jsx("ul", { className: "wallet-adapter-modal-list", children: installedWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.name, icon: wallet.icon, isInstalled: true, onClick: (event) => onWalletClick(wallet, event) }, wallet.name))) })), notInstalledWallets.length > 0 && (_jsx("ul", { className: "wallet-adapter-modal-list", children: notInstalledWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.name, icon: wallet.icon, isInstalled: false, onClick: () => {
                        window.location.href = wallet.downloadLink;
                    } }, wallet.name))) }))] }));
};
