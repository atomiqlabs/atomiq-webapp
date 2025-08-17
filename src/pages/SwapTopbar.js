import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Button, ButtonGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { SwapsContext } from '../swaps/context/SwapsContext';
import { useContext, useEffect, useState } from 'react';
// TODO probably remove later, when this will be implemented elsewhere
const tabs = [
    {
        name: 'Swap',
        path: '/',
    },
    {
        name: 'Scan',
        path: '/scan',
    },
    {
        name: 'History',
        path: '/history',
    },
    {
        name: 'Gas',
        path: '/gas',
    },
];
export function SwapTopbar(props) {
    const navigate = useNavigate();
    const { swapper } = useContext(SwapsContext);
    const [actionableSwaps, setActionableSwaps] = useState(new Set());
    useEffect(() => {
        if (swapper == null)
            return;
        const listener = (swap) => {
            const claimableOrRefundable = swap.requiresAction();
            console.log('SwapTopbar: useEffect(swapper): Swap changed id: ' +
                swap.getId() +
                ' claimableOrRefundable: ' +
                claimableOrRefundable +
                ' swap: ', swap);
            setActionableSwaps((swaps) => {
                const id = swap.getId();
                if (!swaps.has(id)) {
                    if (claimableOrRefundable) {
                        const newSet = new Set(swaps);
                        newSet.add(id);
                        console.log('SwapTopbar: useEffect(swapper): Removing swap from actionable swaps');
                        return newSet;
                    }
                }
                else {
                    if (!claimableOrRefundable) {
                        const newSet = new Set(swaps);
                        newSet.delete(id);
                        console.log('SwapTopbar: useEffect(swapper): Removing swap from actionable swaps');
                        return newSet;
                    }
                }
                return swaps;
            });
        };
        swapper
            .getActionableSwaps()
            .then((swaps) => setActionableSwaps(new Set(swaps.map((swap) => swap.getId()))));
        swapper.on('swapState', listener);
        return () => {
            swapper.off('swapState', listener);
        };
    }, [swapper]);
    return (_jsx("div", { className: "mt-3 pb-2 z-1", children: _jsx(ButtonGroup, { className: "bg-dark bg-opacity-25", children: tabs.map((val, index) => {
                if (index === 3 && props.selected !== index)
                    return;
                return (_jsxs(Button, { onClick: () => {
                        if (props.selected !== index && props.enabled)
                            navigate(val.path);
                    }, variant: index === props.selected ? 'light' : 'outline-light', disabled: !props.enabled, children: [val.name, index === 2 && actionableSwaps.size > 0 ? (_jsx(Badge, { className: "ms-2", bg: "danger", pill: true, children: actionableSwaps.size })) : ('')] }, val.name));
            }) }) }));
}
