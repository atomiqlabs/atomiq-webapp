import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, CloseButton, Modal } from "react-bootstrap";
import Icon from "react-icons-kit";
import { info } from 'react-icons-kit/fa/info';
import { useContext, useState } from "react";
import { useAsync } from "../../utils/hooks/useAsync";
import { SwapsContext } from "../../swaps/context/SwapsContext";
import { ErrorAlert } from "../../components/ErrorAlert";
export function ClearSwapHistoryModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    const { swapper } = useContext(SwapsContext);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    const [clearSwapHistory, clearSwapHistoryLoading, clearSwapHistoryResult, clearSwapHistoryError] = useAsync(async () => {
        const swaps = await swapper.getAllSwaps();
        const swapsByChain = {};
        swaps.forEach(swap => {
            var _a;
            (swapsByChain[_a = swap.chainIdentifier] ?? (swapsByChain[_a] = [])).push(swap);
        });
        for (let chainId in swapsByChain) {
            const chainSwaps = swapsByChain[chainId];
            await swapper.chains[chainId].unifiedSwapStorage.removeAll(chainSwaps);
        }
        props.onFinished();
        return swaps.length;
    }, [swapper]);
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: !!openAppModalOpened, onHide: () => setOpenAppModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Clear swap history", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setOpenAppModalOpened(false) })] }) }), _jsxs(Modal.Body, { children: [clearSwapHistoryResult != null ? (_jsxs("p", { children: ["Successfully removed ", clearSwapHistoryResult, " swaps!"] })) : (_jsx("p", { children: "This will completely clear up your swap history from this browser, some purely off-chain data (like lightning network invoices, lnurls) will be completely lost. Only do this if you certainly know what you are doing!" })), clearSwapHistoryError != null ? (_jsx(ErrorAlert, { title: "Error clearing swap history!", error: clearSwapHistoryError })) : ""] }), _jsx(Modal.Footer, { className: "border-0 d-flex", children: clearSwapHistoryResult ? (_jsx(Button, { variant: "secondary", className: "flex-grow-1", disabled: clearSwapHistoryLoading, onClick: () => setOpenAppModalOpened(false), children: "Exit" })) : (_jsx(Button, { variant: "primary", className: "flex-grow-1", disabled: clearSwapHistoryLoading, onClick: clearSwapHistory, children: "Understood, clear swap history" })) })] }));
}
