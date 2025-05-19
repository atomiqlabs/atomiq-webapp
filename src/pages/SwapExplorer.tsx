import * as React from "react";
import {Badge, Button, Card, Col, OverlayTrigger, Placeholder, Row, Tooltip} from "react-bootstrap";
import {FEConstants, TokenResolver, Tokens} from "../FEConstants";
import {useEffect, useMemo, useRef, useState} from "react";
import {SingleColumnBackendTable} from "../components/table/SingleColumnTable";
import Icon from "react-icons-kit";
import {ic_arrow_forward} from 'react-icons-kit/md/ic_arrow_forward';
import {ic_arrow_downward} from 'react-icons-kit/md/ic_arrow_downward';
import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
import {ChainSwapType, toHumanReadableString, Token} from "@atomiqlabs/sdk";
import {getTimeDeltaText} from "../utils/Utils";
import {TokenIcon} from "../components/TokenIcon";

const timeframes = ["24h", "7d", "30d"];

export function SwapExplorer(props: {}) {

    const refreshTable = useRef<() => void>(null);

    const [displayTimeframeIndex, setDisplayTimeframeIndex] = useState<number>(0);
    const changeTimeframe = () => setDisplayTimeframeIndex((prevState) => (prevState+1) % timeframes.length)
    const displayTimeframe = timeframes[displayTimeframeIndex];
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<{
        "totalSwapCount": number,
        "totalUsdVolume": number,
        "currencyData": {
            [currency in "USDC" | "SOL"]: {
                "count": number,
                "volume": number,
                "volumeUsd": number
            }
        }
        "timeframes": {
            [timeframe in "24h" | "7d" | "30d"]: {
                "count": number,
                "volume": number,
                "volumeUsd": number
            }
        }
    }>(null);

    const [search, setSearch] = useState<string>();
    const searchRef = useRef<ValidatedInputRef>();

    useEffect(() => {

        const abortController = new AbortController();

        setStatsLoading(true);
        fetch(FEConstants.statsUrl+"/GetStats", {signal: abortController.signal}).then(resp => {
            return resp.json();
        }).then(obj => {
            setStats(obj);
            setStatsLoading(false);
        }).catch(e => {
            console.error(e);
            setStatsLoading(false);
        });

        return () => abortController.abort();

    }, []);

    const additionalData = useMemo(() => {
        const additionalData: any = {};
        if(search!=null) additionalData.search = search;
        console.log(additionalData);
        return additionalData;
    }, [search])

    return (
        <div className="flex-fill text-white container mt-5 text-start">
            <h1 className="section-title">Statistics</h1>

            <Row>
                <Col xs={12} md={6} className="pb-3">
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                        <span className="">Total swaps</span>
                        <div className={"flex-row align-items-baseline" + (statsLoading ? "" : " d-flex")}>
                            {statsLoading ? (
                                <h3><Placeholder xs={6}/></h3>
                            ) : (
                                <>
                                    <h3 className="">{stats?.totalSwapCount}</h3>
                                    <h6 className="ms-1 text-success d-flex flex-row align-items-center cursor-pointer"
                                        onClick={changeTimeframe}>
                                        <span>+{stats?.timeframes?.[displayTimeframe]?.count}</span>
                                        <Badge className="font-smallest ms-1 text-dark"
                                               bg="light">{displayTimeframe}</Badge>
                                    </h6>
                                </>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={12} md={6} className="pb-3">
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                        <span>Total volume</span>
                        <div className={"flex-row align-items-baseline" + (statsLoading ? "" : " d-flex")}>
                            {statsLoading ? (
                                <h3><Placeholder xs={6}/></h3>
                            ) : (
                                <>
                                    <h3 className="">{stats?.totalUsdVolume == null ? null : FEConstants.USDollar.format(stats.totalUsdVolume)}</h3>
                                    <h6 className="ms-1 text-success d-flex flex-row align-items-center cursor-pointer"
                                        onClick={changeTimeframe}>
                                        <span>+{stats?.timeframes?.[displayTimeframe]?.volumeUsd == null ? null : FEConstants.USDollar.format(stats?.timeframes?.[displayTimeframe]?.volumeUsd)}</span>
                                        <Badge className="font-smallest ms-1 text-dark"
                                               bg="light">{displayTimeframe}</Badge>
                                    </h6>
                                </>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            <h1 className="section-title mt-4">Explorer</h1>

            <div className="d-flex flex-row mb-3">
                <ValidatedInput
                    className="width-300px"
                    type={"text"}
                    placeholder={"Search by tx ID or wallet address"}
                    inputRef={searchRef}
                />
                <Button className="ms-2" onClick={() => {
                    const val = searchRef.current.getValue();
                    if (val === "") {
                        setSearch(null);
                    } else {
                        setSearch(val);
                    }
                }}>Search</Button>
            </div>

            <div>
                <SingleColumnBackendTable<{
                    chainId?: string,
                    paymentHash: string,

                    timestampInit: number,
                    timestampFinish: number,

                    type: "LN" | "CHAIN",
                    direction: "ToBTC" | "FromBTC",
                    kind: ChainSwapType,
                    nonce: string,

                    lpWallet: string,
                    clientWallet: string,

                    token: string,
                    tokenName: string,
                    tokenAmount: string,
                    rawAmount: string,

                    txInit: string,
                    txFinish: string,

                    btcTx: string,
                    btcOutput?: number,
                    btcAddress?: string,
                    btcAmount?: string,
                    btcRawAmount?: string,
                    btcInAddresses?: string[],

                    success: boolean,
                    finished: boolean,

                    price: string,
                    usdValue: string,

                    id: string,
                    _tokenAmount: number,
                    _rawAmount: number,
                    _usdValue: number,
                    _btcRawAmount: number,
                    _btcAmount: number
                }>
                    column={{
                        renderer: (row) => {
                            const chainId: string = row.chainId ?? "SOLANA";

                            let inputAmount: bigint;
                            let inputCurrency: Token;
                            let outputAmount: bigint;
                            let outputCurrency: Token;

                            let inputExplorer;
                            let txIdInput;
                            let outputExplorer;
                            let txIdOutput;

                            let inputAddress: string = "Unknown";
                            let outputAddress: string = "Unknown";

                            let inputInfo: string;
                            let outputInfo: string;

                            if(row.direction==="ToBTC") {
                                inputAmount = BigInt(row.rawAmount);
                                inputCurrency = TokenResolver[chainId].getToken(row.token);
                                outputAmount = row.btcRawAmount==null ? null : BigInt(row.btcRawAmount);
                                outputCurrency = row.type==="CHAIN" ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
                                txIdInput = row.txInit;
                                txIdOutput = row.type==="CHAIN" ? row.btcTx : row.paymentHash;
                                inputExplorer = FEConstants.blockExplorers[chainId];
                                outputExplorer = row.type==="CHAIN" ? FEConstants.btcBlockExplorer : null;
                                if(row.type==="LN") {
                                    outputInfo = "Lightning network amounts and addresses are private!";
                                } else if(!row.finished) {
                                    outputInfo = "BTC amounts for pending swaps are blinded!";
                                } else if(!row.success) {
                                    outputInfo = "BTC amounts & addresses for failed swaps are never un-blinded!";
                                }
                                inputAddress = row.clientWallet;
                                if(row.type==="CHAIN") outputAddress = row.btcAddress || "Unknown";
                            } else {
                                outputAmount = BigInt(row.rawAmount);
                                outputCurrency = TokenResolver[chainId].getToken(row.token);
                                inputAmount = row.btcRawAmount==null ? null : BigInt(row.btcRawAmount);
                                inputCurrency = row.type==="CHAIN" ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
                                txIdOutput = row.txInit;
                                txIdInput = row.type==="CHAIN" ? row.btcTx : row.paymentHash;
                                outputExplorer = FEConstants.blockExplorers[chainId];
                                inputExplorer = row.type==="CHAIN" ? FEConstants.btcBlockExplorer : null;
                                if(row.type==="LN") {
                                    inputInfo = "Lightning network amounts and addresses are private!";
                                } else if(!row.finished) {
                                    inputInfo = "BTC amounts for pending swaps are blinded!";
                                } else if(!row.success) {
                                    inputInfo = "BTC amounts & addresses for failed swaps are never un-blinded!";
                                }
                                outputAddress = row.clientWallet;
                                if(row.type==="CHAIN" && row.btcInAddresses!=null) {
                                    inputAddress = row.btcInAddresses[0];
                                }
                            }

                            return (
                                <Row className="d-flex flex-row gx-1 gy-1">
                                    <Col xl={2} md={12} className="d-flex text-md-end text-start">
                                        <Row className="gx-1 gy-0 width-fill">
                                            <Col xl={6} md={2} xs={6}>
                                                {!row.finished ? (
                                                    <Badge bg="primary" className="width-fill">Pending</Badge>
                                                ) : row.success ? (
                                                    <Badge bg="success" className="width-fill">Success</Badge>
                                                ) : row.direction==="FromBTC" ? (
                                                    <Badge bg="warning" className="width-fill bg-atomiq-orange">Expired</Badge>
                                                ) : (
                                                    <Badge bg="danger" className="width-fill">Refunded</Badge>
                                                )}
                                            </Col>
                                            <Col xl={6} md={2} xs={6}>
                                                {row.type==="CHAIN" ? (
                                                    <Badge bg="warning" className="width-fill">On-chain</Badge>
                                                ) : (
                                                    <Badge bg="dark" className="width-fill">Lightning</Badge>
                                                )}
                                            </Col>
                                            <Col xl={0} lg={2} md={1} xs={0}>
                                            </Col>
                                            <Col xl={12} lg={2} md={3} xs={6}>
                                                <small className="">{new Date(row.timestampInit*1000).toLocaleString()}</small>
                                            </Col>
                                            <Col xl={12} md={2} xs={3}>
                                                <small className="">{getTimeDeltaText(row.timestampInit*1000)} ago</small>
                                            </Col>
                                            <Col xl={12} md={2} xs={3} className="text-end">
                                                <span className="font-weight-500">{FEConstants.USDollar.format(row._usdValue)}</span>
                                            </Col>
                                        </Row>
                                    </Col>
                                    <Col xl={10} md={12} className="d-flex">
                                        <div className="card border-0 bg-white bg-opacity-10 p-2 width-fill container-fluid">
                                            <Row className="">
                                                <Col md={6} xs={12} className="d-flex flex-row align-items-center">
                                                    <div className="min-width-0 me-md-2">
                                                        <a className="font-small single-line-ellipsis" target="_blank" href={inputExplorer==null || txIdInput==null ? null : inputExplorer+txIdInput}>{txIdInput || "None"}</a>
                                                        <span className="d-flex align-items-center font-weight-500 my-1">
                                                            <TokenIcon tokenOrTicker={inputCurrency} className="currency-icon-medium"/>
                                                            {inputAmount==null || inputCurrency==null ? "???" : toHumanReadableString(inputAmount, inputCurrency)} {inputCurrency?.ticker || "???"}
                                                            {inputInfo!=null ? (
                                                                <OverlayTrigger overlay={<Tooltip id={"explorer-tooltip-in-"+row.id}>
                                                                    {inputInfo}
                                                                </Tooltip>}>
                                                                    <Badge bg="primary" className="ms-2 pill-round px-2" pill>?</Badge>
                                                                </OverlayTrigger>
                                                            ) : ""}
                                                        </span>
                                                        <small className="single-line-ellipsis">{inputAddress}</small>
                                                    </div>
                                                    <Icon size={22} icon={ic_arrow_forward} className="d-md-block d-none" style={{marginLeft: "auto", marginRight: "-22px", marginBottom: "6px"}}/>
                                                </Col>
                                                <Col md={0} xs={12} className="d-md-none d-flex justify-content-center">
                                                    <Icon size={22} icon={ic_arrow_downward} className="" style={{marginBottom: "6px"}}/>
                                                </Col>
                                                <Col md={6} xs={12} className="ps-md-4">
                                                    <a className="font-small single-line-ellipsis" target="_blank" href={outputExplorer==null || txIdOutput==null ? null : outputExplorer+txIdOutput}>{txIdOutput || "..."}</a>
                                                    <span className="d-flex align-items-center font-weight-500 my-1">
                                                        <TokenIcon tokenOrTicker={outputCurrency} className="currency-icon-medium"/>
                                                        {outputAmount==null || outputCurrency==null ? "???" : toHumanReadableString(outputAmount, outputCurrency)} {outputCurrency?.ticker || "???"}
                                                        {outputInfo!=null ? (
                                                            <OverlayTrigger overlay={<Tooltip id={"explorer-tooltip-out-"+row.id}>
                                                                {outputInfo}
                                                            </Tooltip>}>
                                                                <Badge bg="primary" className="ms-2 pill-round px-2" pill>?</Badge>
                                                            </OverlayTrigger>
                                                        ) : ""}
                                                    </span>
                                                    <small className="single-line-ellipsis">{outputAddress}</small>
                                                </Col>
                                            </Row>
                                        </div>
                                    </Col>
                                </Row>
                            );
                        }
                    }}
                    endpoint={FEConstants.statsUrl+"/GetSwapList"}
                    itemsPerPage={10}
                    refreshFunc={refreshTable}
                    additionalData={additionalData}
                />
            </div>
        </div>
    );
}