import {
    Badge,
    Card,
    Col,
    Form,
    Placeholder,
    Row,
} from "react-bootstrap";
import {bitcoinTokenArray} from "../utils/Currencies";
import {useContext, useEffect, useState} from "react";
import * as React from "react";
import ValidatedInput from "../components/ValidatedInput";
import {FEConstants, TokenResolver, Tokens} from "../FEConstants";
import {SingleColumnStaticTable} from "../components/table/SingleColumnTable";
import {getTimeDeltaText} from "../utils/Utils";
import {SwapsContext} from "../context/SwapsContext";
import {TokenIcon} from "../components/TokenIcon";
import {ButtonWithSigner} from "../components/ButtonWithSigner";
import {ErrorAlert} from "../components/ErrorAlert";
import {toHumanReadableString} from "@atomiqlabs/sdk";

type AffiliatePayout = {
    timestamp: number,
    txId: string,
    amountSats: string,
    amountToken: string,
    token: string,
    state: "pending" | "fail" | "success"
};

const chain = "SOLANA";

export function Affiliate() {
    const {swapper, chains} = useContext(SwapsContext);

    const [data, setData] = useState<{
        stats: {
            address: string,
            identifier: string,
            totalSwapCount: number,
            totalVolumeSats: string,
            totalFeeSats: string,
            unclaimedFeeSats: string,
            totalClaimedUsdc: string,
            payouts: AffiliatePayout[]
        },
        unclaimedUsdcValue: string,
        _unclaimedUsdcValue: number,
        token: string,
        minPayoutSats: string,
        nextPayoutTimestamp: number
    }>();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>();

    useEffect(() => {
        if(swapper==null || chains==null || chains[chain]==null || chains[chain].random) {
            setData(null);
            return;
        }

        const address: string = chains[chain].signer.getAddress();
        if(address!=null) {
            setLoading(true);
            setError(null);
            setData(null);
            fetch(FEConstants.affiliateUrl+"?affiliate="+encodeURIComponent(address)).then(resp => {
                return resp.json();
            }).then(obj => {
                setLoading(false);
                if(obj.code!==10000) {
                    obj.message = obj.msg;
                    setError(obj);
                    return;
                }
                obj.data.stats.payouts.sort((a, b) => b.timestamp - a.timestamp);
                setData(obj.data);
            }).catch(e => {
                setLoading(false);
                setError(e);
            });
        }
    }, [swapper, chains]);

    const currencySpec = data?.token==null ? null : TokenResolver[chain].getToken(data.token);

    return (
        <>
            <div className="flex-fill text-white container mt-5 text-start">
                <h1 className="section-title">Referral</h1>
                <Card className="px-3 pt-3 bg-dark bg-opacity-25 mb-3 border-0">
                    <h3>How does it work?</h3>
                    <p>
                        Invite your friends to use atomiq via your invite link, they can enjoy
                        reduced <strong>0.2%</strong> fee rate (instead of regular 0.3%), and you get a kickback
                        for <strong>0.1%</strong> of their swap volume.
                    </p>
                    <p>
                        Your kickback is accrued in BTC and payed out automatically to your Solana wallet address
                        in {currencySpec?.ticker} every day.
                    </p>
                    {data==null ? (
                        <ButtonWithSigner className="mb-3" chainId={chain} signer={undefined}/>
                    ) : (
                        <>
                            <p>
                                Minimum
                                payout: <strong>{toHumanReadableString(data?.minPayoutSats==null ? 0n : BigInt(data?.minPayoutSats), Tokens.BITCOIN.BTC)} BTC</strong>
                            </p>
                            <p>
                                Next
                                payout: <strong>{new Date(data?.nextPayoutTimestamp).toLocaleString()}</strong> (in {getTimeDeltaText(data?.nextPayoutTimestamp || 0, true)})
                            </p>
                        </>
                        )}
                </Card>
                <div className={data == null ? "d-none" : ""}>
                    <Card className="px-3 pt-3 bg-dark bg-opacity-25 mb-3 pb-3 border-0">
                        <h3>Your referral link</h3>
                        {loading ? (
                            <Placeholder xs={12} as={Form.Control}/>
                        ) : (
                            <ValidatedInput
                                type={"text"}
                                value={data?.stats?.address==null ? "" : FEConstants.dappUrl+"?affiliate="+encodeURIComponent(data.stats.identifier)}
                                copyEnabled={true}
                            />
                        )}
                    </Card>
                    <Row>
                        <Col xs={12} lg={4} className="pb-3">
                            <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                                <span className="">Referral swap volume</span>
                                <h4 className="mb-0">{loading ? (
                                    <Placeholder xs={6} />
                                ) : (
                                    <>
                                        <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTC} className="currency-icon-medium pb-2"/>
                                        {toHumanReadableString(data?.stats?.totalVolumeSats==null ? 0n : BigInt(data?.stats?.totalVolumeSats), Tokens.BITCOIN.BTC)+" BTC"}
                                    </>
                                )}</h4>
                                <small className="mb-2" style={{marginTop: "-6px"}}>{loading || currencySpec==null ? (
                                    <Placeholder xs={6} />
                                ) : "across "+data?.stats?.totalSwapCount+" swaps"}</small>
                            </Card>
                        </Col>
                        <Col xs={12} lg={4} className="pb-3">
                            <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                                <span className="">Total accrued kickback</span>
                                <h4>{loading ? (
                                    <Placeholder xs={6} />
                                ) : (
                                    <>
                                        <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTC} className="currency-icon-medium pb-2"/>
                                        {toHumanReadableString(data?.stats?.totalFeeSats==null ? 0n : BigInt(data?.stats?.totalFeeSats), bitcoinTokenArray[0])+" BTC"}
                                    </>
                                )}</h4>
                            </Card>
                        </Col>
                        <Col xs={12} lg={4} className="pb-3">
                            <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
                                <span className="">Pending payout</span>
                                <h4 className="mb-0">{loading ? (
                                    <Placeholder xs={6} />
                                ) : (
                                    <>
                                        <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTC} className="currency-icon-medium pb-2"/>
                                        {toHumanReadableString(data?.stats?.unclaimedFeeSats==null ? 0n : BigInt(data?.stats?.unclaimedFeeSats), bitcoinTokenArray[0])+" BTC"}
                                    </>
                                )}</h4>
                                <label className="mb-2">{loading || currencySpec==null ? (
                                    <Placeholder xs={6} />
                                ) : (
                                    <>
                                        <TokenIcon tokenOrTicker={currencySpec} className="currency-icon-small pb-2"/>
                                        {"~"+toHumanReadableString(data?.unclaimedUsdcValue==null ? 0n : BigInt(data?.unclaimedUsdcValue), currencySpec)+" "+currencySpec.ticker}
                                    </>
                                )}</label>
                            </Card>
                        </Col>
                    </Row>

                    <h1 className="section-title mt-4">Payouts</h1>

                    <SingleColumnStaticTable<AffiliatePayout>
                        data={data?.stats?.payouts!=null ? data.stats.payouts : []}
                        column={{
                            renderer: (row: AffiliatePayout) => {
                                let inputAmount: bigint = BigInt(row.amountSats);
                                let inputCurrency = Tokens.BITCOIN.BTC;
                                let outputAmount: bigint = BigInt(row.amountToken);
                                let outputCurrency = TokenResolver[chain].getToken(row.token);

                                let txIdInput: string = row.txId;

                                return (
                                    <Row className="d-flex flex-row gx-1 gy-1">
                                        <Col xl={2} md={12} className="d-flex text-md-end text-start">
                                            <Row className="gx-1 gy-0 width-fill">
                                                <Col xl={12} md={4} xs={12}>
                                                    {row.state==="pending" ? (
                                                        <Badge bg="primary" className="width-fill">Pending</Badge>
                                                    ) : row.state==="success" ? (
                                                        <Badge bg="success" className="width-fill">Success</Badge>
                                                    ) : (
                                                        <Badge bg="danger" className="width-fill">Refunded</Badge>
                                                    )}
                                                </Col>
                                                <Col xl={12} md={4} xs={6}>
                                                    <small className="">{new Date(row.timestamp).toLocaleString()}</small>
                                                </Col>
                                                <Col xl={12} md={4} xs={6} className="text-end">
                                                    <small className="">{getTimeDeltaText(row.timestamp)} ago</small>
                                                </Col>
                                            </Row>
                                        </Col>
                                        <Col xl={10} md={12} className="d-flex">
                                            <div className="card border-0 bg-white bg-opacity-10 p-2 width-fill container-fluid">
                                                <div className="min-width-0">
                                                    <a className="font-small single-line-ellipsis" target="_blank" href={txIdInput==null ? null : FEConstants.blockExplorers[chain]+txIdInput}>{txIdInput || "None"}</a>
                                                    <span className="d-flex align-items-center font-weight-500 my-1">
                                                    <TokenIcon tokenOrTicker={outputCurrency} className="currency-icon-medium"/>
                                                        {toHumanReadableString(outputAmount, outputCurrency)} {outputCurrency.ticker}
                                                </span>
                                                    <small className="d-flex align-items-center">
                                                        <TokenIcon tokenOrTicker={inputCurrency} className="currency-icon-small"/>
                                                        {toHumanReadableString(inputAmount, inputCurrency)} {inputCurrency.ticker}
                                                    </small>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                );
                            }
                        }}
                        itemsPerPage={10}
                        loading={loading}
                    />
                </div>

                <ErrorAlert className="mb-2" title="Loading failed" error={error}/>

            </div>
        </>
    )
}
