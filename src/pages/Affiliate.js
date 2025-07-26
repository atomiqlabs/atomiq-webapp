import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge, Card, Col, Form, Placeholder, Row } from "react-bootstrap";
import { bitcoinTokenArray } from "../tokens/Tokens";
import { useContext, useEffect, useState } from "react";
import ValidatedInput from "../components/ValidatedInput";
import { FEConstants, TokenResolver, Tokens } from "../FEConstants";
import { SingleColumnStaticTable } from "../table/SingleColumnTable";
import { getTimeDeltaText } from "../utils/Utils";
import { SwapsContext } from "../swaps/context/SwapsContext";
import { TokenIcon } from "../tokens/TokenIcon";
import { ButtonWithWallet } from "../wallets/ButtonWithWallet";
import { ErrorAlert } from "../components/ErrorAlert";
import { toHumanReadableString } from "@atomiqlabs/sdk";
import { ChainDataContext } from "../wallets/context/ChainDataContext";
const chain = "SOLANA";
export function Affiliate() {
    const { swapper } = useContext(SwapsContext);
    const [data, setData] = useState();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState();
    const currencySpec = data?.token == null ? null : TokenResolver[chain].getToken(data.token);
    const chains = useContext(ChainDataContext);
    const solanaWallet = chains?.[chain]?.wallet;
    useEffect(() => {
        if (swapper == null || solanaWallet == null) {
            setData(null);
            return;
        }
        const address = solanaWallet.instance.getAddress();
        if (address != null) {
            setLoading(true);
            setError(null);
            setData(null);
            fetch(FEConstants.affiliateUrl + "?affiliate=" + encodeURIComponent(address))
                .then((resp) => {
                return resp.json();
            })
                .then((obj) => {
                setLoading(false);
                if (obj.code !== 10000) {
                    obj.message = obj.msg;
                    setError(obj);
                    return;
                }
                obj.data.stats.payouts.sort((a, b) => b.timestamp - a.timestamp);
                setData(obj.data);
            })
                .catch((e) => {
                setLoading(false);
                setError(e);
            });
        }
    }, [swapper, solanaWallet]);
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "flex-fill text-white container mt-5 text-start", children: [_jsx("h1", { className: "section-title", children: "Referral" }), _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 mb-3 border-0", children: [_jsx("h3", { children: "How does it work?" }), _jsxs("p", { children: ["Invite your friends to use atomiq via your invite link, they can enjoy reduced ", _jsx("strong", { children: "0.2%" }), " fee rate (instead of regular 0.3%), and you get a kickback for ", _jsx("strong", { children: "0.1%" }), " of their swap volume."] }), _jsxs("p", { children: ["Your kickback is accrued in BTC and payed out automatically to your Solana wallet address in ", currencySpec?.ticker, " every day."] }), data == null ? (_jsx(ButtonWithWallet, { className: "mb-3", chainId: chain })) : (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Minimum payout:", " ", _jsxs("strong", { children: [toHumanReadableString(data?.minPayoutSats == null
                                                    ? 0n
                                                    : BigInt(data?.minPayoutSats), Tokens.BITCOIN.BTC), " ", "BTC"] })] }), _jsxs("p", { children: ["Next payout:", " ", _jsx("strong", { children: new Date(data?.nextPayoutTimestamp).toLocaleString() }), " ", "(in ", getTimeDeltaText(data?.nextPayoutTimestamp || 0, true), ")"] })] }))] }), _jsxs("div", { className: data == null ? "d-none" : "", children: [_jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 mb-3 pb-3 border-0", children: [_jsx("h3", { children: "Your referral link" }), loading ? (_jsx(Placeholder, { xs: 12, as: Form.Control })) : (_jsx(ValidatedInput, { type: "text", value: data?.stats?.address == null
                                        ? ""
                                        : FEConstants.dappUrl +
                                            "?affiliate=" +
                                            encodeURIComponent(data.stats.identifier), copyEnabled: true }))] }), _jsxs(Row, { children: [_jsx(Col, { xs: 12, lg: 4, className: "pb-3", children: _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0", children: [_jsx("span", { className: "", children: "Referral swap volume" }), _jsx("h4", { className: "mb-0", children: loading ? (_jsx(Placeholder, { xs: 6 })) : (_jsxs(_Fragment, { children: [_jsx(TokenIcon, { tokenOrTicker: Tokens.BITCOIN.BTC, className: "currency-icon-medium pb-2" }), toHumanReadableString(data?.stats?.totalVolumeSats == null
                                                            ? 0n
                                                            : BigInt(data?.stats?.totalVolumeSats), Tokens.BITCOIN.BTC) + " BTC"] })) }), _jsx("small", { className: "mb-2", style: { marginTop: "-6px" }, children: loading || currencySpec == null ? (_jsx(Placeholder, { xs: 6 })) : ("across " + data?.stats?.totalSwapCount + " swaps") })] }) }), _jsx(Col, { xs: 12, lg: 4, className: "pb-3", children: _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0", children: [_jsx("span", { className: "", children: "Total accrued kickback" }), _jsx("h4", { children: loading ? (_jsx(Placeholder, { xs: 6 })) : (_jsxs(_Fragment, { children: [_jsx(TokenIcon, { tokenOrTicker: Tokens.BITCOIN.BTC, className: "currency-icon-medium pb-2" }), toHumanReadableString(data?.stats?.totalFeeSats == null
                                                            ? 0n
                                                            : BigInt(data?.stats?.totalFeeSats), bitcoinTokenArray[0]) + " BTC"] })) })] }) }), _jsx(Col, { xs: 12, lg: 4, className: "pb-3", children: _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0", children: [_jsx("span", { className: "", children: "Pending payout" }), _jsx("h4", { className: "mb-0", children: loading ? (_jsx(Placeholder, { xs: 6 })) : (_jsxs(_Fragment, { children: [_jsx(TokenIcon, { tokenOrTicker: Tokens.BITCOIN.BTC, className: "currency-icon-medium pb-2" }), toHumanReadableString(data?.stats?.unclaimedFeeSats == null
                                                            ? 0n
                                                            : BigInt(data?.stats?.unclaimedFeeSats), bitcoinTokenArray[0]) + " BTC"] })) }), _jsx("label", { className: "mb-2", children: loading || currencySpec == null ? (_jsx(Placeholder, { xs: 6 })) : (_jsxs(_Fragment, { children: [_jsx(TokenIcon, { tokenOrTicker: currencySpec, className: "currency-icon-small pb-2" }), "~" +
                                                            toHumanReadableString(data?.unclaimedUsdcValue == null
                                                                ? 0n
                                                                : BigInt(data?.unclaimedUsdcValue), currencySpec) +
                                                            " " +
                                                            currencySpec.ticker] })) })] }) })] }), _jsx("h1", { className: "section-title mt-4", children: "Payouts" }), _jsx(SingleColumnStaticTable, { data: data?.stats?.payouts != null ? data.stats.payouts : [], column: {
                                renderer: (row) => {
                                    let inputAmount = BigInt(row.amountSats);
                                    let inputCurrency = Tokens.BITCOIN.BTC;
                                    let outputAmount = BigInt(row.amountToken);
                                    let outputCurrency = TokenResolver[chain].getToken(row.token);
                                    let txIdInput = row.txId;
                                    return (_jsxs(Row, { className: "d-flex flex-row gx-1 gy-1", children: [_jsx(Col, { xl: 2, md: 12, className: "d-flex text-md-end text-start", children: _jsxs(Row, { className: "gx-1 gy-0 width-fill", children: [_jsx(Col, { xl: 12, md: 4, xs: 12, children: row.state === "pending" ? (_jsx(Badge, { bg: "primary", className: "width-fill", children: "Pending" })) : row.state === "success" ? (_jsx(Badge, { bg: "success", className: "width-fill", children: "Success" })) : (_jsx(Badge, { bg: "danger", className: "width-fill", children: "Refunded" })) }), _jsx(Col, { xl: 12, md: 4, xs: 6, children: _jsx("small", { className: "", children: new Date(row.timestamp).toLocaleString() }) }), _jsx(Col, { xl: 12, md: 4, xs: 6, className: "text-end", children: _jsxs("small", { className: "", children: [getTimeDeltaText(row.timestamp), " ago"] }) })] }) }), _jsx(Col, { xl: 10, md: 12, className: "d-flex", children: _jsx("div", { className: "card border-0 bg-white bg-opacity-10 p-2 width-fill container-fluid", children: _jsxs("div", { className: "min-width-0", children: [_jsx("a", { className: "font-small single-line-ellipsis", target: "_blank", href: txIdInput == null
                                                                    ? null
                                                                    : FEConstants.blockExplorers[chain] + txIdInput, children: txIdInput || "None" }), _jsxs("span", { className: "d-flex align-items-center font-weight-500 my-1", children: [_jsx(TokenIcon, { tokenOrTicker: outputCurrency, className: "currency-icon-medium" }), toHumanReadableString(outputAmount, outputCurrency), " ", outputCurrency.ticker] }), _jsxs("small", { className: "d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: inputCurrency, className: "currency-icon-small" }), toHumanReadableString(inputAmount, inputCurrency), " ", inputCurrency.ticker] })] }) }) })] }));
                                },
                            }, itemsPerPage: 10, loading: loading })] }), _jsx(ErrorAlert, { className: "mb-2", title: "Loading failed", error: error })] }) }));
}
