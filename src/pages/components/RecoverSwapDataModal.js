import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, CloseButton, Modal } from "react-bootstrap";
import Icon from "react-icons-kit";
import { info } from 'react-icons-kit/fa/info';
import { useContext, useMemo, useState } from "react";
import { useAsync } from "../../utils/hooks/useAsync";
import { SwapType } from "@atomiqlabs/sdk";
import { SwapsContext } from "../../swaps/context/SwapsContext";
import { ErrorAlert } from "../../components/ErrorAlert";
import { ChainDataContext } from "../../wallets/context/ChainDataContext";
export function RecoverSwapDataModal(props) {
    const [openAppModalOpened, setOpenAppModalOpened] = useState(false);
    const { swapper } = useContext(SwapsContext);
    const chains = useContext(ChainDataContext);
    props.openRef.current = () => {
        setOpenAppModalOpened(true);
    };
    const [recoverPastSwaps, recoverPastSwapsLoading, recoveredPastSwaps, recoverPastSwapsError] = useAsync(async () => {
        const totalSwaps = [];
        const supportedSmartChains = swapper.getSmartChains();
        for (let chainId in chains) {
            if (!supportedSmartChains.includes(chainId))
                continue;
            const chainData = chains[chainId];
            if (chainData?.wallet?.address == null)
                continue;
            try {
                console.log(`Recovering swaps for ${chainId}, with user's address: ${chainData.wallet.address}`);
                const chainSwaps = await swapper.recoverSwaps(chainId, chainData.wallet.address);
                console.log(`Found ${chainSwaps.length} swaps on ${chainId}`);
                totalSwaps.push(...chainSwaps);
            }
            catch (e) {
                if (e?.message?.startsWith?.("Historical swap recovery is not supported"))
                    continue;
                throw e;
            }
        }
        props.onFinished();
        return totalSwaps;
    }, [chains, swapper, props.onFinished]);
    const recoveredRefundableSwaps = useMemo(() => {
        if (recoveredPastSwaps == null)
            return [];
        return recoveredPastSwaps
            .filter(swap => swap.getType() === SwapType.TO_BTCLN && swap.isRefundable());
    }, [recoveredPastSwaps]);
    const [refundPastSwaps, refundPastSwapsLoading, refundPastSwapsResult, refundPastSwapsError] = useAsync(async () => {
        let counter = 0;
        for (let swap of recoveredRefundableSwaps) {
            if (!swap.isRefundable())
                continue;
            const chainData = chains[swap.chainIdentifier];
            if (chainData == null || chainData.wallet == null)
                continue;
            await swap.refund(chainData.wallet.instance);
            counter++;
        }
        return counter;
    }, [chains, swapper, recoveredRefundableSwaps]);
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: !!openAppModalOpened, onHide: () => setOpenAppModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: [_jsx(Icon, { icon: info, className: "d-flex align-items-center me-2" }), " Recover swap data", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => setOpenAppModalOpened(false) })] }) }), _jsxs(Modal.Body, { children: [recoveredPastSwaps != null ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Successfully recovered ", recoveredPastSwaps.length, " swaps!"] }), recoveredRefundableSwaps?.length > 0
                                ? _jsxs("p", { children: ["Found ", recoveredRefundableSwaps.length, " refundable swaps, you can refund them all by clicking the refund button below!"] })
                                : ""] })) : recoverPastSwapsLoading ? (_jsx("p", { children: "Rescanning chains for swap data..." })) : (_jsx("p", { children: "This functionality allows you to recover your swaps from on-chain data, in case you've lost them, their state got corrupted or for other reasons. Make sure the relevant wallet which initiated the swaps is connected to the webapp. This might take a few minutes as it rescans the blockchain!" })), refundPastSwapsResult != null ? (_jsxs("p", { children: ["Succesfully refunded ", refundPastSwapsResult, " swaps!"] })) : "", recoverPastSwapsError != null ? (_jsx(ErrorAlert, { title: "Error recovering swaps!", error: recoverPastSwapsError })) : "", refundPastSwapsError != null ? (_jsx(ErrorAlert, { title: "Error refunding swaps!", error: refundPastSwapsError })) : ""] }), _jsx(Modal.Footer, { className: "border-0 d-flex", children: recoveredRefundableSwaps?.length > 0 ? (_jsx(Button, { variant: "primary", className: "flex-grow-1", disabled: refundPastSwapsLoading, onClick: refundPastSwaps, children: "Refund" })) : recoveredPastSwaps != null ? (_jsx(Button, { variant: "secondary", className: "flex-grow-1", onClick: () => setOpenAppModalOpened(false), children: "Exit" })) : (_jsx(Button, { variant: "primary", className: "flex-grow-1", disabled: recoverPastSwapsLoading, onClick: recoverPastSwaps, children: "Begin recovery" })) })] }));
}
