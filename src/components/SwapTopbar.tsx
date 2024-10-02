import {Badge, Button, ButtonGroup} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {SwapsContext} from "../context/SwapsContext";
import {useContext} from "react";

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
        name: "Pending",
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

    const context = useContext(SwapsContext);

    return (
        <div className="mt-3 pb-2 z-1">
            <ButtonGroup className="bg-dark bg-opacity-25">
                {tabs.map((val, index) => {
                    if(index===2 && context.actionableSwaps.length===0) return;
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
                            {index===2 ? (
                                <Badge className="ms-2" bg="danger" pill>{context.actionableSwaps.length}</Badge>
                            ) : ""}
                        </Button>
                    );
                })}
            </ButtonGroup>
        </div>
    );
}