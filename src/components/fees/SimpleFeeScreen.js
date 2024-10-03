import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { FromBTCSwap, IToBTCSwap, ToBTCSwap } from "sollightning-sdk";
import { bitcoinCurrencies, getCurrencySpec, getNativeCurrency, toHumanReadable, toHumanReadableString } from "../../utils/Currencies";
import * as BN from "bn.js";
import { BitcoinWalletContext } from "../../context/BitcoinWalletContext";
import { useContext, useEffect, useState } from "react";
import { Accordion, Badge, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { getFeePct } from "../../utils/Utils";
import Icon from "react-icons-kit";
import { ic_receipt_outline } from 'react-icons-kit/md/ic_receipt_outline';
import { FEConstants } from "../../FEConstants";
import { SwapsContext } from "../../context/SwapsContext";
function FeePart(props) {
    return (_jsxs("div", { className: "d-flex font-medium " + props.className, children: [_jsxs("small", { className: "d-flex align-items-center" + (props.bold ? " fw-bold" : ""), children: [props.text, props.feePPM == null ? "" : props.feeBase == null ? (_jsxs(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: [props.feePPM.toNumber() / 10000, " %"] })) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, children: _jsxs("span", { children: [props.feePPM.toNumber() / 10000, "% + ", toHumanReadableString(props.feeBase, props.feeCurrency), " ", props.feeCurrency.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "dottedUnderline", children: [props.feePPM.toNumber() / 10000, "%"] }) }) })), props.description != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-desc-" + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsx("span", { className: "dottedUnderline", children: "?" }) }) })) : ""] }), _jsx("span", { className: "ms-auto fw-bold d-flex align-items-center", children: _jsx(OverlayTrigger, { placement: "left", overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, className: "font-default", children: props.currency2 == null ? (_jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx("img", { src: props.currency1.icon, className: "currency-icon-small", style: { marginTop: "-2px" } }), _jsxs("span", { children: [toHumanReadableString(props.amount1, props.currency1), " ", props.currency1.ticker] })] })) : (_jsxs("span", { className: "ms-auto text-end", children: [_jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx("img", { src: props.currency1.icon, className: "currency-icon-small", style: { marginTop: "-1px" } }), _jsxs("span", { children: [toHumanReadableString(props.amount1, props.currency1), " ", props.currency1.ticker] })] }), _jsx("span", { className: "d-flex align-items-center justify-content-center fw-bold", children: "=" }), _jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx("img", { src: props.currency2.icon, className: "currency-icon-small" }), _jsxs("span", { children: [toHumanReadableString(props.amount2, props.currency2), " ", props.currency2.ticker] })] })] })) }), children: _jsxs("span", { className: "text-decoration-dotted font-monospace", children: ["$", (props.usdValue == null ? 0 : props.usdValue).toFixed(2)] }) }) })] }));
}
function FeeSummary(props) {
    const totalUsdFee = props.feeBreakdown == null ? 0 : props.feeBreakdown.reduce((value, e) => e.usdValue == null ? value : value + parseFloat(e.usdValue.toFixed(2)), 0);
    return (_jsx(Accordion, { children: _jsxs(Accordion.Item, { eventKey: "0", className: "tab-accent-nop", children: [_jsxs(Accordion.Header, { className: "font-bigger d-flex flex-row", bsPrefix: "fee-accordion-header", children: [_jsxs("small", { className: "me-auto", children: ["1 ", props.dstCurrency.ticker, " = ", props.swapPrice.toFixed(props.srcCurrency.decimals), " ", props.srcCurrency.ticker] }), _jsx(Icon, { className: "d-flex me-1", size: 16, icon: ic_receipt_outline }), _jsx("span", { className: "me-2", children: props.loading ? (_jsx(Spinner, { animation: "border", size: "sm" })) : "$" + totalUsdFee.toFixed(2) })] }), _jsx(Accordion.Body, { className: "p-2", children: props.feeBreakdown.map((e, index) => {
                        return (_jsx(FeePart, { className: e.className, usdValue: e.usdValue, text: e.text, description: e.description, currency1: e.currency1, currency2: e.currency2, amount1: e.amount1, amount2: e.amount2, feePPM: e.feePPM, feeBase: e.feeBase, feeCurrency: e.feeCurrency }, index));
                    }) })] }) }));
}
export function SimpleFeeSummaryScreen(props) {
    const { swapper } = useContext(SwapsContext);
    const { bitcoinWallet } = useContext(BitcoinWalletContext);
    const [btcTxFee, setBtcTxFee] = useState();
    const [_btcTxFeeLoading, setBtcTxFeeLoading] = useState(false);
    const btcTxFeeLoading = bitcoinWallet != null && props.btcFeeRate != null && props.btcFeeRate != 0 && props.swap != null && props.swap instanceof FromBTCSwap && _btcTxFeeLoading;
    useEffect(() => {
        if (swapper == null)
            return;
        setBtcTxFee(null);
        if (bitcoinWallet == null || props.btcFeeRate == null || props.btcFeeRate == 0 || props.swap == null || !(props.swap instanceof FromBTCSwap))
            return;
        const swap = props.swap;
        setBtcTxFeeLoading(true);
        let cancelled = false;
        (async () => {
            try {
                const [usdcPrice, btcTxFee] = await Promise.all([
                    swapper.prices.preFetchPrice(FEConstants.usdcToken),
                    bitcoinWallet.getTransactionFee(swap.address, props.swap.getInAmount(), props.btcFeeRate)
                ]);
                if (btcTxFee == null) {
                    if (cancelled)
                        return;
                    setBtcTxFeeLoading(false);
                    return;
                }
                const btcTxFeeBN = new BN(btcTxFee);
                const usdcNetworkFee = await swapper.prices.getFromBtcSwapAmount(btcTxFeeBN, FEConstants.usdcToken, null, usdcPrice);
                if (cancelled)
                    return;
                setBtcTxFee({
                    text: "Network fee",
                    description: "Bitcoin transaction fee paid to bitcoin miners (this is a fee on top of your specified input amount)",
                    currency1: bitcoinCurrencies[0],
                    amount1: btcTxFeeBN,
                    usdValue: toHumanReadable(usdcNetworkFee, FEConstants.usdcToken).toNumber()
                });
                setBtcTxFeeLoading(false);
            }
            catch (e) {
                if (cancelled)
                    return;
                console.error(e);
                setBtcTxFeeLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [bitcoinWallet, props.btcFeeRate, props.swap, swapper]);
    const [scSideFees, setScSideFees] = useState();
    useEffect(() => {
        if (swapper == null)
            return;
        setScSideFees(null);
        const inputCurrency = getCurrencySpec(props.swap.getInToken());
        const outputCurrency = getCurrencySpec(props.swap.getOutToken());
        const isFromBtc = props.swap.getInToken().chain === "BTC";
        const btcCurrency = isFromBtc ? inputCurrency : outputCurrency;
        const abortController = new AbortController();
        const fees = [];
        const usdcPricePromise = swapper.prices.preFetchPrice(FEConstants.usdcToken, abortController.signal);
        const swapFee = props.swap.getSwapFee();
        const swapFeeBtc = isFromBtc ? swapFee.amountInSrcToken : swapFee.amountInDstToken;
        fees.push(usdcPricePromise.then(usdcPrice => swapper.prices.getFromBtcSwapAmount(swapFeeBtc, FEConstants.usdcToken, abortController.signal, usdcPrice)).then(swapFeeUsdc => {
            return {
                text: "Swap fee",
                feePPM: getFeePct(props.swap, 1),
                feeBase: props.swap.pricingInfo.satsBaseFee,
                feeCurrency: btcCurrency,
                currency1: inputCurrency,
                amount1: swapFee.amountInSrcToken,
                currency2: outputCurrency,
                amount2: swapFee.amountInDstToken,
                usdValue: toHumanReadable(swapFeeUsdc, FEConstants.usdcToken).toNumber()
            };
        }));
        if (props.swap instanceof IToBTCSwap) {
            const networkFee = props.swap.getNetworkFee();
            fees.push(usdcPricePromise.then(usdcPrice => swapper.prices.getFromBtcSwapAmount(networkFee.amountInDstToken, FEConstants.usdcToken, abortController.signal, usdcPrice)).then(networkFeeUsdc => {
                return {
                    text: "Network fee",
                    description: props.swap instanceof ToBTCSwap ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network",
                    currency1: inputCurrency,
                    amount1: networkFee.amountInSrcToken,
                    currency2: outputCurrency,
                    amount2: networkFee.amountInDstToken,
                    usdValue: toHumanReadable(networkFeeUsdc, FEConstants.usdcToken).toNumber()
                };
            }));
        }
        if (props.swap instanceof FromBTCSwap) {
            const nativeCurrency = swapper.getNativeCurrency();
            const claimerBounty = props.swap.getClaimerBounty();
            fees.push(Promise.all([
                usdcPricePromise,
                swapper.prices.getToBtcSwapAmount(claimerBounty, nativeCurrency, abortController.signal)
            ])
                .then(([usdcPrice, claimerBountyBtc]) => swapper.prices.getFromBtcSwapAmount(claimerBountyBtc, FEConstants.usdcToken, abortController.signal, usdcPrice))
                .then(claimerBountyUsdc => {
                return {
                    text: "Watchtower fee",
                    description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                    currency1: getNativeCurrency(),
                    amount1: claimerBounty,
                    usdValue: toHumanReadable(claimerBountyUsdc, FEConstants.usdcToken).toNumber()
                };
            }));
        }
        Promise.all(fees).then(fees => {
            if (abortController.signal.aborted)
                return;
            setScSideFees(fees);
        }).catch(e => {
            if (abortController.signal.aborted)
                return;
            console.error(e);
        });
        return () => abortController.abort();
    }, [props.swap, swapper]);
    const allFees = (btcTxFee != null ? [btcTxFee] : []).concat(scSideFees || []);
    return (_jsx(FeeSummary, { srcCurrency: getCurrencySpec(props.swap.getInToken()), dstCurrency: getCurrencySpec(props.swap.getOutToken()), swapPrice: props.swap.getSwapPrice(), feeBreakdown: allFees, loading: scSideFees == null || btcTxFeeLoading }));
}
