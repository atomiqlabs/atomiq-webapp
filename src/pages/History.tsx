import {SwapTopbar} from "./SwapTopbar";
import {Badge, Button, Col, Row} from "react-bootstrap";
import {
    IFromBTCSwap,
    isSCToken,
    ISwap,
    IToBTCSwap,
    SwapDirection, SwapType
} from "@atomiqlabs/sdk";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {SwapsContext} from "../swaps/context/SwapsContext";
import {useNavigate} from "react-router-dom";
import {TokenIcon} from "../tokens/TokenIcon";
import {SingleColumnStaticTable} from "../table/SingleColumnTable";
import {FEConstants} from "../FEConstants";
import {getTimeDeltaText} from "../utils/Utils";
import Icon from "react-icons-kit";
import {ic_arrow_forward} from 'react-icons-kit/md/ic_arrow_forward';
import {ic_arrow_downward} from 'react-icons-kit/md/ic_arrow_downward';

function HistoryEntry(props: {
    swap: ISwap,
}) {
    const navigate = useNavigate();

    const input = props.swap.getInput();
    const output = props.swap.getOutput();

    const inputExplorer = isSCToken(input.token) ? FEConstants.blockExplorers[input.token.chainId] : !input.token.lightning ? FEConstants.btcBlockExplorer : null;
    const outputExplorer = isSCToken(output.token) ? FEConstants.blockExplorers[output.token.chainId] : !output.token.lightning ? FEConstants.btcBlockExplorer : null;

    const txIdInput = props.swap.getInputTxId();
    const txIdOutput = props.swap.getOutputTxId();

    const inputAddress = props.swap instanceof IToBTCSwap ? props.swap._getInitiator() : "";
    const outputAddress = props.swap.getOutputAddress();

    const refundable = props.swap.getDirection()===SwapDirection.TO_BTC && (props.swap as IToBTCSwap).isRefundable();
    const claimable = props.swap.getDirection()===SwapDirection.FROM_BTC && (props.swap as IFromBTCSwap).isClaimable();

    const navigateToSwap = (event) => {
        event.preventDefault();
        navigate("/?swapId="+props.swap.getId());
    }

    const badge = props.swap.isSuccessful() ? (
        <Badge bg="success" className="width-fill">Success</Badge>
    ) : props.swap.isFailed() ? (
        <Badge bg="danger" className="width-fill">Failed</Badge>
    ) : props.swap.isQuoteSoftExpired() ? (
        <Badge bg="danger" className="width-fill">Quote expired</Badge>
    ) : refundable ? (
        <Badge bg="warning" className="width-fill">Refundable</Badge>
    ) : claimable ? (
        <Badge bg="warning" className="width-fill">Claimable</Badge>
    ) : (
        <Badge bg="primary" className="width-fill">Pending</Badge>
    );

    return (
        <Row className="d-flex flex-row gx-1 gy-1">
            <Col xs={12} className="d-md-none text-end">
                <Row className="gx-1 gy-0 width-fill">
                    <Col xs={6}>
                        {badge}
                    </Col>
                    <Col xs={6}>
                        <small className="">{getTimeDeltaText(props.swap.createdAt)} ago</small>
                    </Col>
                </Row>
            </Col>
            <Col md={10} sm={12} className="d-flex">
                <div
                    className="card border-0 bg-transparent p-2 width-fill container-fluid">
                    <Row className="">
                        <Col md={6} xs={12} className="d-flex flex-row align-items-center">
                            <div className="min-width-0 me-md-2">
                                <a
                                    className="font-small single-line-ellipsis" target="_blank"
                                    href={inputExplorer == null || txIdInput == null ? null : inputExplorer + txIdInput}
                                >{txIdInput || "None"}</a>
                                <span className="d-flex align-items-center font-weight-500 my-1">
                                    <TokenIcon tokenOrTicker={input.token} className="currency-icon-medium"/>
                                    {input.amount} {input.token.ticker || "???"}
                                </span>
                                <small className="single-line-ellipsis">{inputAddress}</small>
                            </div>
                            <Icon size={22} icon={ic_arrow_forward}
                                  className="d-md-block d-none" style={{
                                marginLeft: "auto",
                                marginRight: "-22px",
                                marginBottom: "6px"
                            }}/>
                        </Col>
                        <Col md={0} xs={12} className="d-md-none d-flex justify-content-center">
                            <Icon size={22} icon={ic_arrow_downward} className=""
                                  style={{marginBottom: "6px"}}/>
                        </Col>
                        <Col md={6} xs={12} className="ps-md-4">
                            <a className="font-small single-line-ellipsis" target="_blank"
                               href={outputExplorer == null || txIdOutput == null ? null : outputExplorer + txIdOutput}>{txIdOutput || "..."}</a>
                            <span className="d-flex align-items-center font-weight-500 my-1">
                                <TokenIcon tokenOrTicker={output.token} className="currency-icon-medium"/>
                                {output.amount} {output.token.ticker || "???"}
                            </span>
                            <small className="single-line-ellipsis">{outputAddress}</small>
                        </Col>
                    </Row>
                </div>
            </Col>
            <Col md={2} sm={12} className="d-flex text-end flex-column">
                <div className="d-none d-md-block">
                    <small className="">{getTimeDeltaText(props.swap.createdAt)} ago</small>
                </div>
                <div className="d-none d-md-block mb-1">
                    {badge}
                </div>
                <Button variant={claimable || refundable ? "primary" : "secondary"} size="sm" href={"/?swapId="+props.swap.getId()} className="width-fill" onClick={navigateToSwap}>
                    {refundable ? "Refund" : claimable ? "Claim" : "View"}
                </Button>
            </Col>
        </Row>
    );
}

export function History() {

    const {swapper} = useContext(SwapsContext);

    const [swaps, setSwaps] = useState<ISwap[]>([]);

    useEffect(() => {
        if (swapper == null) return;
        swapper.getAllSwaps().then(swaps => {
            setSwaps(swaps.filter(swap =>
                swap.isInitiated() &&
                swap.getType()!==SwapType.TRUSTED_FROM_BTC &&
                swap.getType()!==SwapType.TRUSTED_FROM_BTCLN
            ).sort((a, b) => {
                const _a = a.requiresAction();
                const _b = b.requiresAction();
                if(_a===_b) return b.createdAt - a.createdAt;
                if(_a) return -1;
                if(_b) return 1;
            }));
        });

        const listener = (swap: ISwap) => {
            if(!swap.isInitiated()) return;
            if(swap.getType()===SwapType.TRUSTED_FROM_BTC || swap.getType()===SwapType.TRUSTED_FROM_BTCLN) return;
            setSwaps(swaps => {
                if (swaps.includes(swap)) return [...swaps];
                return [swap, ...swaps];
            });
        };
        swapper.on("swapState", listener);

        return () => {
            swapper.off("swapState", listener);
            setSwaps([]);
            console.log("History: Set swaps to []");
        }
    }, [swapper]);

    return (
        <>
            <SwapTopbar selected={2} enabled={true}/>

            <div className="flex-fill text-white container text-start">
                <SingleColumnStaticTable<ISwap>
                    column={{
                        renderer: (row) => {
                            return <HistoryEntry swap={row}/>;
                        }
                    }}
                    data={swaps}
                    itemsPerPage={10}
                />
            </div>
        </>
    )
}
