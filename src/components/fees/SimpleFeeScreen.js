import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { SwapType, toHumanReadableString, toTokenAmount } from "@atomiqlabs/sdk";
import { BitcoinWalletContext } from "../../context/BitcoinWalletProvider";
import { useContext, useEffect, useState } from "react";
import { Accordion, Badge, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { capitalizeFirstLetter, getFeePct } from "../../utils/Utils";
import Icon from "react-icons-kit";
import { ic_receipt_outline } from 'react-icons-kit/md/ic_receipt_outline';
import { SwapsContext } from "../../context/SwapsContext";
import { TokenIcon } from "../TokenIcon";
import { Tokens } from "../../FEConstants";
function FeePart(props) {
    return (_jsxs("div", { className: "d-flex font-medium " + props.className, children: [_jsxs("small", { className: "d-flex align-items-center" + (props.bold ? " fw-bold" : ""), children: [props.text, props.feePPM == null ? "" : props.feeBase == null ? (_jsxs(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: [Number(props.feePPM) / 10000, " %"] })) : (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, children: _jsxs("span", { children: [Number(props.feePPM) / 10000, "% + ", toHumanReadableString(props.feeBase, props.feeCurrency), " ", props.feeCurrency.ticker] }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsxs("span", { className: "dottedUnderline", children: [Number(props.feePPM) / 10000, "%"] }) }) })), props.description != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "fee-tooltip-desc-" + props.text, children: _jsx("span", { children: props.description }) }), children: _jsx(Badge, { bg: "primary", className: "ms-1 pill-round px-2", pill: true, children: _jsx("span", { className: "dottedUnderline", children: "?" }) }) })) : ""] }), _jsx("span", { className: "ms-auto fw-bold d-flex align-items-center", children: _jsx(OverlayTrigger, { placement: "left", overlay: _jsx(Tooltip, { id: "fee-tooltip-" + props.text, className: "font-default", children: props.fee.amountInDstToken == null ? (_jsxs("span", { className: "ms-auto d-flex align-items-center", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: "-2px" } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] })) : (_jsxs("span", { className: "ms-auto text-end", children: [_jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInSrcToken.token, className: "currency-icon-small", style: { marginTop: "-1px" } }), _jsxs("span", { children: [props.fee.amountInSrcToken.amount, " ", props.fee.amountInSrcToken.token.ticker] })] }), _jsx("span", { className: "d-flex align-items-center justify-content-center fw-bold", children: "=" }), _jsxs("span", { className: "d-flex align-items-center justify-content-start", children: [_jsx(TokenIcon, { tokenOrTicker: props.fee.amountInDstToken.token, className: "currency-icon-small" }), _jsxs("span", { children: [props.fee.amountInDstToken.amount, " ", props.fee.amountInDstToken.token.ticker] })] })] })) }), children: _jsxs("span", { className: "text-decoration-dotted font-monospace", children: ["$", (props.usdValue == null ? 0 : props.usdValue).toFixed(2)] }) }) })] }));
}
function FeeSummary(props) {
    const totalUsdFee = props.feeBreakdown == null ? 0 : props.feeBreakdown.reduce((value, e) => e.usdValue == null ? value : value + parseFloat(e.usdValue.toFixed(2)), 0);
    return (_jsx(Accordion, { children: _jsxs(Accordion.Item, { eventKey: "0", className: "tab-accent-nop", children: [_jsxs(Accordion.Header, { className: "font-bigger d-flex flex-row", bsPrefix: "fee-accordion-header", children: [_jsxs("small", { className: "me-auto", children: ["1 ", props.dstCurrency.ticker, " = ", props.swapPrice.toFixed(props.srcCurrency.displayDecimals ?? props.srcCurrency.decimals), " ", props.srcCurrency.ticker] }), _jsx(Icon, { className: "d-flex me-1", size: 16, icon: ic_receipt_outline }), _jsx("span", { className: "me-2", children: props.loading ? (_jsx(Spinner, { animation: "border", size: "sm" })) : "$" + totalUsdFee.toFixed(2) })] }), _jsx(Accordion.Body, { className: "p-2", children: props.feeBreakdown.map((e, index) => {
                        return (_jsx(FeePart, { className: e.className, usdValue: e.usdValue, text: e.text, description: e.description, fee: e.fee, feePPM: e.feePPM, feeBase: e.feeBase, feeCurrency: e.feeCurrency }, index));
                    }) })] }) }));
}
export function SimpleFeeSummaryScreen(props) {
    const { swapper } = useContext(SwapsContext);
    const { bitcoinWallet } = useContext(BitcoinWalletContext);
    const [btcTxFee, setBtcTxFee] = useState();
    const [_btcTxFeeLoading, setBtcTxFeeLoading] = useState(false);
    const btcTxFeeLoading = bitcoinWallet != null && props.btcFeeRate != null && props.btcFeeRate != 0 && props.swap != null && props.swap.getType() === SwapType.FROM_BTC && _btcTxFeeLoading;
    useEffect(() => {
        if (swapper == null)
            return;
        setBtcTxFee(null);
        if (bitcoinWallet == null || props.btcFeeRate == null || props.btcFeeRate == 0 || props.swap == null || props.swap.getType() !== SwapType.FROM_BTC)
            return;
        const swap = props.swap;
        setBtcTxFeeLoading(true);
        let cancelled = false;
        (async () => {
            try {
                const input = props.swap.getInput();
                const [usdPrice, btcTxFee] = await Promise.all([
                    swapper.prices.preFetchUsdPrice(),
                    bitcoinWallet.getTransactionFee(swap.address, input.rawAmount, props.btcFeeRate)
                ]);
                if (btcTxFee == null) {
                    if (cancelled)
                        return;
                    setBtcTxFeeLoading(false);
                    return;
                }
                const feeInBtc = toTokenAmount(BigInt(btcTxFee), Tokens.BITCOIN.BTC, swapper.prices);
                const btcNetworkFee = {
                    amountInSrcToken: feeInBtc,
                    amountInDstToken: null,
                    usdValue: feeInBtc.usdValue
                };
                if (cancelled)
                    return;
                setBtcTxFee({
                    text: "Bitcoin network fee",
                    description: "Bitcoin transaction fee paid to bitcoin miners (this is a fee on top of your specified input amount)",
                    fee: btcNetworkFee,
                    usdValue: await btcNetworkFee.usdValue(null, usdPrice)
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
    const [scTxFee, setScTxFee] = useState();
    const [_scTxFeeLoading, setScTxFeeLoading] = useState(false);
    const scTxFeeLoading = props.swap.getSmartChainNetworkFee != null && _scTxFeeLoading;
    useEffect(() => {
        if (swapper == null)
            return;
        setScTxFee(null);
        if (props.swap.getSmartChainNetworkFee == null)
            return;
        setScTxFeeLoading(true);
        let cancelled = false;
        (async () => {
            try {
                const [usdPrice, tokenAmount] = await Promise.all([
                    swapper.prices.preFetchUsdPrice(),
                    props.swap.getSmartChainNetworkFee()
                ]);
                const scNetworkFee = {
                    amountInSrcToken: tokenAmount,
                    amountInDstToken: null,
                    usdValue: tokenAmount.usdValue
                };
                if (cancelled)
                    return;
                setScTxFee({
                    text: capitalizeFirstLetter(tokenAmount.token.chainId) + " network fee",
                    description: capitalizeFirstLetter(tokenAmount.token.chainId) + " transaction fee (this is a fee on top of your specified input amount)",
                    fee: scNetworkFee,
                    usdValue: await scNetworkFee.usdValue(null, usdPrice)
                });
                setScTxFeeLoading(false);
            }
            catch (e) {
                if (cancelled)
                    return;
                console.error(e);
                setScTxFeeLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [props.swap, swapper]);
    const [scSideFees, setScSideFees] = useState();
    useEffect(() => {
        if (swapper == null)
            return;
        setScSideFees(null);
        const abortController = new AbortController();
        const fees = [];
        const usdPricePromise = swapper.prices.preFetchUsdPrice(abortController.signal);
        const swapFee = props.swap.getSwapFee();
        const isFromBtc = swapFee.amountInSrcToken.token.chain === "BTC";
        const btcCurrency = isFromBtc ? swapFee.amountInSrcToken.token : swapFee.amountInDstToken.token;
        fees.push(usdPricePromise.then(usdPrice => swapFee.usdValue(abortController.signal, usdPrice)).then(swapFeeUsd => {
            return {
                text: "Swap fee",
                feePPM: getFeePct(props.swap, 1),
                feeBase: props.swap.pricingInfo.satsBaseFee,
                feeCurrency: btcCurrency,
                fee: swapFee,
                usdValue: swapFeeUsd
            };
        }));
        if (props.swap.getType() === SwapType.TO_BTC || props.swap.getType() === SwapType.TO_BTCLN) {
            const networkFee = props.swap.getNetworkFee();
            fees.push(usdPricePromise.then(usdPrice => networkFee.usdValue(abortController.signal, usdPrice)).then(networkFeeUsd => {
                return {
                    text: props.swap.getType() === SwapType.TO_BTC ? "Bitcoin network fee" : "Lightning network fee",
                    description: props.swap.getType() === SwapType.TO_BTC ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network",
                    fee: networkFee,
                    usdValue: networkFeeUsd
                };
            }));
        }
        if (props.swap.getType() === SwapType.FROM_BTC) {
            const claimerBounty = props.swap.getClaimerBounty();
            fees.push(usdPricePromise.then(usdPrice => claimerBounty.usdValue(abortController.signal, usdPrice)).then(claimerBountyUsd => {
                return {
                    text: "Watchtower fee",
                    description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                    fee: {
                        amountInSrcToken: claimerBounty,
                        amountInDstToken: null,
                        usdValue: claimerBounty.usdValue
                    },
                    usdValue: claimerBountyUsd
                };
            }));
        }
        if (props.swap.getType() === SwapType.SPV_VAULT_FROM_BTC) {
            const claimerBounty = props.swap.getCallerFee();
            fees.push(usdPricePromise.then(usdPrice => claimerBounty.usdValue(abortController.signal, usdPrice)).then(claimerBountyUsd => {
                return {
                    text: "Watchtower fee",
                    description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                    fee: claimerBounty,
                    usdValue: claimerBountyUsd
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
    const additionalFees = [];
    if (btcTxFee != null)
        additionalFees.push(btcTxFee);
    if (scTxFee != null)
        additionalFees.push(scTxFee);
    const allFees = additionalFees.concat(scSideFees || []);
    return (_jsx(FeeSummary, { srcCurrency: props.swap.getInput().token, dstCurrency: props.swap.getOutput().token, swapPrice: props.swap.getSwapPrice(), feeBreakdown: allFees, loading: scSideFees == null || btcTxFeeLoading || scTxFeeLoading }));
}
