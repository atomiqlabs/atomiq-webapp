import {SwapTopbar} from "../components/SwapTopbar";
import {Alert, Badge, Button, Card, Col, ListGroup, Spinner} from "react-bootstrap";
import {FromBTCSwapState, FromBTCLNSwap, FromBTCSwap, IFromBTCSwap, ISwap, IToBTCSwap, SwapType} from "@atomiqlabs/sdk";
import {useContext, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {useNavigate} from "react-router-dom";
import * as React from "react";
import {TokenIcon} from "../components/TokenIcon";

//TODO: Requires completion for multiple signers
function HistoryEntry(props: {
    swap: ISwap,
    onError: (error: string) => void
}) {

    const [loading, setLoading] = useState<boolean>(false);

    const {removeSwap, getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.swap);

    const navigate = useNavigate();

    const input = props.swap.getInput();
    const output = props.swap.getOutput();

    if(props.swap instanceof IToBTCSwap) {

        const refund = async () => {
            setLoading(true);
            props.onError(null);
            try {
                await (props.swap as IToBTCSwap<any>).refund(signer);
                removeSwap(props.swap);
            } catch (e) {
                props.onError(e.toString());
            }
            setLoading(false);
        };

        return (
            <ListGroup.Item as="li" className="text-start d-flex flex-row">
                <Col>
                    <div>
                        <b>Swap</b>
                        <Badge bg="danger" className="ms-2">Failed (refundable)</Badge>
                    </div>
                    <small>
                        <TokenIcon tokenOrTicker={input.token} className="currency-icon-history me-1"/>
                        {input.amount} -{">"} <TokenIcon tokenOrTicker={output.token} className="currency-icon-history me-1"/>
                        {output.amount}
                    </small>
                </Col>
                <Col xs={3} className="d-flex">
                    <Button disabled={loading} onClick={refund} variant="outline-primary" className="px-1 flex-fill">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        Refund
                    </Button>
                </Col>
            </ListGroup.Item>
        );
    } else if(props.swap instanceof IFromBTCSwap) {
        const shouldContinue = props.swap instanceof FromBTCSwap && props.swap.getState()===FromBTCSwapState.CLAIM_COMMITED;

        const claim = async () => {
            setLoading(true);
            props.onError(null);
            try {
                if(props.swap instanceof FromBTCSwap) {
                    await props.swap.claim(signer);
                } else if(props.swap instanceof FromBTCLNSwap) {
                    await props.swap.commitAndClaim(signer);
                }
                removeSwap(props.swap);
            } catch (e) {
                props.onError(e.toString());
            }
            setLoading(false);
        };

        const cont = () => {
            navigate("/?swapId="+props.swap.getPaymentHash().toString("hex"));
        };

        return (
            <Card className="text-start d-flex flex-row tab-bg text-white border-0 p-3 my-2">
                <Col>
                    <div>
                        <b>Swap</b>
                        <Badge bg={shouldContinue ? "primary" : "success"} className="ms-2">
                            {shouldContinue ? "Open" :  "Claimable"}
                        </Badge>
                    </div>
                    <small>
                        <TokenIcon tokenOrTicker={input.token} className="currency-icon-history me-1"/>
                        {input.amount} -{">"} <TokenIcon tokenOrTicker={output.token} className="currency-icon-history me-1"/>
                        {output.amount}
                    </small>
                </Col>
                <Col xs={3} className="d-flex">
                    <Button disabled={loading} onClick={shouldContinue ? cont : claim} variant="light" className="px-1 flex-fill">
                        {loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                        {shouldContinue ? "Continue" : "Claim"}
                    </Button>
                </Col>
            </Card>
        );
    }
}

export function History() {

    const [error, setError] = useState<string>();

    const {actionableSwaps} = useContext(SwapsContext);

    const entries = [];

    for(let actionableSwap of actionableSwaps) {
        let shouldAdd = false;
        if(actionableSwap.getType()===SwapType.TO_BTC || actionableSwap.getType()===SwapType.TO_BTCLN){
            shouldAdd = (actionableSwap as IToBTCSwap<any>).isRefundable()
        }
        if(actionableSwap.getType()===SwapType.FROM_BTC || actionableSwap.getType()===SwapType.FROM_BTCLN){
            shouldAdd = (actionableSwap as IFromBTCSwap<any>).isClaimable();
        }
        if(shouldAdd) entries.push(<HistoryEntry swap={actionableSwap} onError={setError}/>);
    }

    return (
        <>
            <SwapTopbar selected={2} enabled={true}/>

            <div className="d-flex flex-column flex-fill align-items-center text-white mt-n2">

                {error==null ? "" : (
                    <Alert variant={"danger"} className="mb-2">
                        <div>
                            <b>Action failed</b>
                        </div>
                        {error}
                    </Alert>
                )}

                <div className="swap-panel">
                    {entries}
                </div>
            </div>
        </>
    )
}

/*
<ListGroup.Item as="li" className="text-start d-flex flex-row">
    <Col>
        <div>
            <b>Swap</b>
            <Badge bg="danger" className="ms-2">Failed (refundable)</Badge>
        </div>
        <img src="/icons/crypto/BTC.svg" className="currency-icon-history me-1"/>
        0.001 -{">"} <img src="/icons/crypto/SOL.svg" className="currency-icon-history me-1"/>
        0.021232
    </Col>
    <Col xs={3} className="d-flex">
        <Button className="px-1 flex-fill">
            Refund
        </Button>
    </Col>
</ListGroup.Item>
<ListGroup.Item as="li" className="text-start d-flex flex-row">
    <Col>
        <div>
            <b>Swap</b>
            <Badge bg="success" className="ms-2">Claimable</Badge>
        </div>
        <img src="/icons/crypto/BTC.svg" className="currency-icon-history me-1"/>
        0.00191293 -{">"} <img src="/icons/crypto/SOL.svg" className="currency-icon-history me-1"/>
        0.021232941
    </Col>
    <Col xs={3} className="d-flex">
        <Button variant="outline-primary" className="px-1 flex-fill">
            Continue
        </Button>
    </Col>
</ListGroup.Item>
 */