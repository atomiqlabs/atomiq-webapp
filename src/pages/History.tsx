import {SwapTopbar} from "../components/SwapTopbar";
import {FromBTCSwapState, SolanaSwapper} from "sollightning-sdk/dist";
import {Alert, Badge, Button, Card, Col, ListGroup, Spinner} from "react-bootstrap";
import {FromBTCLNSwap, FromBTCSwap, IFromBTCSwap, ISwap, IToBTCSwap, SwapType} from "sollightning-sdk";
import {getCurrencySpec, toHumanReadableString} from "../utils/Currencies";
import {useContext, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {useNavigate} from "react-router-dom";
import * as React from "react";

function HistoryEntry(props: {
    swap: ISwap,
    onError: (error: string) => void
}) {

    const [loading, setLoading] = useState<boolean>(false);

    const {removeSwap} = useContext(SwapsContext);

    const navigate = useNavigate();

    const fromCurrency = getCurrencySpec(props.swap.getInToken());
    const toCurrency = getCurrencySpec(props.swap.getOutToken());

    if(props.swap instanceof IToBTCSwap) {

        const refund = async () => {
            setLoading(true);
            props.onError(null);
            try {
                await (props.swap as IToBTCSwap<any>).refund();
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
                        <img src={fromCurrency.icon} className="currency-icon-history me-1"/>
                        {toHumanReadableString(props.swap.getInAmount(), fromCurrency)} -{">"} <img src={toCurrency.icon} className="currency-icon-history me-1"/>
                        {toHumanReadableString(props.swap.getOutAmount(), toCurrency)}
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
                    await props.swap.claim();
                } else if(props.swap instanceof FromBTCLNSwap) {
                    await props.swap.commitAndClaim();
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
                        <img src={fromCurrency.icon} className="currency-icon-history me-1"/>
                        {toHumanReadableString(props.swap.getInAmount(), fromCurrency)} -{">"} <img src={toCurrency.icon} className="currency-icon-history me-1"/>
                        {toHumanReadableString(props.swap.getOutAmount(), toCurrency)}
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