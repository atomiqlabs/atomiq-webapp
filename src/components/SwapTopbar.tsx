import {Badge, Button, ButtonGroup} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {SwapsContext} from "../context/SwapsContext";
import {useContext, useEffect, useState} from "react";
import {ISwap} from "@atomiqlabs/sdk";

const tabs = [
    {
        name: "Swap",
        path: "/"
    },
    {
        name: "Scan",
        path: "/scan"
    },
    {
        name: "History",
        path: "/history"
    },
    {
        name: "Gas",
        path: "/gas"
    }
];

export function SwapTopbar(props: {
    selected: number,
    enabled: boolean
}) {

    const navigate = useNavigate();

    const {swapper} = useContext(SwapsContext);

    const [actionableSwaps, setActionableSwaps] = useState<Set<string>>(new Set());
    useEffect(() => {
        if(swapper==null) return;
        const listener = (swap: ISwap) => {
            const claimableOrRefundable = swap.isActionable();
            console.log("SwapTopbar: useEffect(swapper): Swap changed id: "+swap.getPaymentHashString()+" claimableOrRefundable: "+claimableOrRefundable);
            setActionableSwaps((swaps) => {
                const id = swap.getPaymentHashString();
                if(!swaps.has(id)) {
                    if(claimableOrRefundable) {
                        const newSet = new Set(swaps);
                        newSet.add(id);
                        console.log("SwapTopbar: useEffect(swapper): Removing swap from actionable swaps");
                        return newSet;
                    }
                } else {
                    if(!claimableOrRefundable) {
                        const newSet = new Set(swaps);
                        newSet.delete(id);
                        console.log("SwapTopbar: useEffect(swapper): Removing swap from actionable swaps");
                        return newSet;
                    }
                }
                return swaps;
            });
        };

        swapper.getActionableSwaps().then(swaps => setActionableSwaps(new Set(swaps.map(swap => swap.getPaymentHashString()))));
        swapper.on("swapState", listener);

        return () => {
            swapper.off("swapState", listener);
        }
    }, [swapper]);

    return (
        <div className="mt-3 pb-2 z-1">
            <ButtonGroup className="bg-dark bg-opacity-25">
                {tabs.map((val, index) => {
                    if(index===3 && props.selected!==index) return;
                    return (
                        <Button
                            key={val.name}
                            onClick={() => {
                                if(props.selected!==index && props.enabled) navigate(val.path)
                            }}
                            variant={index===props.selected ? "light" : "outline-light"}
                            disabled={!props.enabled}
                        >
                            {val.name}
                            {index===2 && actionableSwaps.size>0 ? (
                                <Badge className="ms-2" bg="danger" pill>{actionableSwaps.size}</Badge>
                            ) : ""}
                        </Button>
                    );
                })}
            </ButtonGroup>
        </div>
    );
}