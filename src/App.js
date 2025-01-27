import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './App.css';
import * as React from "react";
import { useEffect, useRef } from "react";
import SolanaWalletProvider from "./context/SolanaWalletProvider";
import { QuickScan } from "./pages/quickscan/QuickScan";
import { QuickScanExecute } from "./pages/quickscan/QuickScanExecute";
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { FEConstants } from "./FEConstants";
import { smartChainTokenArray } from "./utils/Currencies";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SwapsContext } from "./context/SwapsContext";
import { BitcoinNetwork, isSCToken, MultichainSwapper, SolanaFees, SolanaSigner } from "@atomiqlabs/sdk";
import { History } from "./pages/History";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Badge, Col, Container, Form, Nav, Navbar, OverlayTrigger, Row, Spinner, Tooltip } from "react-bootstrap";
import { FAQ } from "./pages/FAQ";
import { About } from "./pages/About";
import { Map } from "./pages/Map";
import { info } from 'react-icons-kit/fa/info';
import { question } from 'react-icons-kit/fa/question';
import { exchange } from 'react-icons-kit/fa/exchange';
import Icon from "react-icons-kit";
import * as BN from "bn.js";
import { LNNFCReader, LNNFCStartResult } from './lnnfc/LNNFCReader';
import { ic_contactless } from 'react-icons-kit/md/ic_contactless';
import { SwapForGas } from "./pages/SwapForGas";
import { SwapExplorer } from "./pages/SwapExplorer";
import { Affiliate } from "./pages/Affiliate";
import { gift } from 'react-icons-kit/fa/gift';
import { BitcoinWalletContext } from './context/BitcoinWalletContext';
import { WebLNContext } from './context/WebLNContext';
import { heart } from 'react-icons-kit/fa/heart';
import { SwapNew } from "./pages/SwapNew";
import { useAnchorNavigate } from "./utils/useAnchorNavigate";
import { ErrorAlert } from "./components/ErrorAlert";
import { useBitcoinWalletContext } from "./utils/useBitcoinWalletContext";
require('@solana/wallet-adapter-react-ui/styles.css');
const noWalletPaths = new Set(["/about", "/faq", "/map", "/46jh456f45f"]);
const jitoPubkey = "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL";
const jitoEndpoint = "https://mainnet.block-engine.jito.wtf/api/v1/transactions";
function WrappedApp() {
    const navigateHref = useAnchorNavigate();
    const { connection } = useConnection();
    const [swapper, setSwapper] = React.useState();
    const [swapperLoadingError, setSwapperLoadingError] = React.useState();
    const [swapperLoading, setSwapperLoading] = React.useState(false);
    const [signers, setSigners] = React.useState({});
    const solanaWallet = useAnchorWallet();
    useEffect(() => {
        if (swapper == null)
            return;
        setSigners((prevValue) => {
            return { ...prevValue, SOLANA: { signer: solanaWallet == null ? swapper.randomSigner("SOLANA") : new SolanaSigner(solanaWallet), random: solanaWallet == null } };
        });
    }, [solanaWallet, swapper]);
    // @ts-ignore
    const pathName = window.location.pathname.split("?")[0];
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("affiliate")) {
        window.localStorage.setItem("atomiq-affiliate", searchParams.get("affiliate"));
    }
    const affiliateLink = searchParams.get("affiliate") || window.localStorage.getItem("atomiq-affiliate");
    const abortController = useRef();
    const loadSwapper = async () => {
        setSwapperLoadingError(null);
        setSwapperLoading(true);
        if (abortController.current != null)
            abortController.current.abort();
        abortController.current = new AbortController();
        try {
            const useLp = searchParams.get("UNSAFE_LP_URL");
            console.log("init start");
            // const connection = new Connection(FEConstants.rpcUrl);
            const solanaFees = new SolanaFees(connection, 1000000, 2, 100, "auto", "high", () => new BN(50000) /*, {
                address: jitoPubkey,
                endpoint: jitoEndpoint
            }*/);
            const swapper = new MultichainSwapper({
                chains: {
                    SOLANA: {
                        rpcUrl: connection,
                        retryPolicy: {
                            transactionResendInterval: 3000
                        },
                        fees: solanaFees
                    }
                },
                intermediaryUrl: useLp,
                getRequestTimeout: 15000,
                postRequestTimeout: 30000,
                bitcoinNetwork: FEConstants.chain === "DEVNET" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
                pricingFeeDifferencePPM: new BN(50000),
                defaultAdditionalParameters: {
                    affiliate: affiliateLink
                }
            });
            await swapper.init();
            if (abortController.current.signal.aborted)
                return;
            console.log(swapper);
            console.log("Swapper initialized, getting claimable swaps...");
            setSwapper(swapper);
            setSwapperLoading(false);
            setSigners((prevValue) => {
                const cpy = { ...prevValue };
                for (let chainId of swapper.getChains()) {
                    if (cpy[chainId] == null)
                        cpy[chainId] = { signer: swapper.randomSigner(chainId), random: true };
                }
                return cpy;
            });
            return swapper;
        }
        catch (e) {
            setSwapperLoadingError(e);
            console.error(e);
        }
    };
    React.useEffect(() => {
        if (!noWalletPaths.has(pathName) && swapper == null)
            loadSwapper();
    }, [pathName]);
    const [nfcSupported, setNfcSupported] = React.useState(false);
    const [nfcEnabled, setNfcEnabled] = React.useState(true);
    React.useEffect(() => {
        setNfcSupported(LNNFCReader.isSupported());
        setNfcEnabled(!LNNFCReader.isUserDisabled());
    }, []);
    const nfcSet = (val, target) => {
        console.log("NFC set: ", val);
        if (val === true) {
            const reader = new LNNFCReader();
            reader.start(true).then(resp => {
                console.log("start response: ", resp);
                if (resp === LNNFCStartResult.OK) {
                    setNfcEnabled(true);
                    target.checked = true;
                    reader.stop();
                }
            });
        }
        if (val === false) {
            setNfcEnabled(false);
            target.checked = false;
            LNNFCReader.userDisable();
            console.log("Set nfc disabled: ", val);
        }
    };
    console.log("nfcDisabled: ", nfcEnabled);
    const [webLNWallet, setWebLNWallet] = React.useState();
    return (_jsx(BitcoinWalletContext.Provider, { value: useBitcoinWalletContext(), children: _jsxs(WebLNContext.Provider, { value: {
                lnWallet: webLNWallet,
                setLnWallet: setWebLNWallet
            }, children: [_jsx(Navbar, { collapseOnSelect: true, expand: "lg ", bg: "dark", variant: "dark", className: "bg-dark bg-opacity-50", style: { zIndex: 1000, minHeight: "64px" }, children: _jsxs(Container, { className: "max-width-100", children: [_jsx(Navbar.Brand, { href: "/", className: "d-flex flex-column", children: _jsxs("div", { className: "d-flex flex-row", style: { fontSize: "1.5rem" }, children: [_jsx("img", { src: "/icons/atomiq-flask.png", className: "logo-img" }), _jsx("b", { children: "atomiq" }), _jsx("span", { style: { fontWeight: 300 }, children: ".exchange" }), FEConstants.chain === "DEVNET" ? _jsx(Badge, { className: "ms-2 d-flex align-items-center", bg: "danger", children: "DEVNET" }) : ""] }) }), _jsxs("div", { className: "d-flex flex-column", children: [_jsx(Badge, { className: "newBadgeCollapse d-lg-none", children: "New!" }), _jsx(Navbar.Toggle, { "aria-controls": "basic-navbar-nav", className: "ms-3" })] }), _jsxs(Navbar.Collapse, { role: "", id: "basic-navbar-nav", children: [_jsxs(Nav, { className: "d-flex d-lg-none me-auto text-start border-top border-dark-subtle my-2 " + (swapper == null ? "" : "border-bottom"), children: [_jsxs(Nav.Link, { href: "/", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: exchange, className: "d-flex me-1" }), _jsx("span", { children: "Swap" })] }), _jsxs(Nav.Link, { href: "/about", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: info, className: "d-flex me-1" }), _jsx("span", { children: "About" })] }), _jsxs(Nav.Link, { href: "/faq", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: question, className: "d-flex me-1" }), _jsx("span", { children: "FAQ" })] }), _jsxs(Nav.Link, { href: "/referral", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: gift, className: "d-flex me-1" }), _jsx("span", { className: "me-1", children: "Referral" }), _jsx(Badge, { className: "me-2", children: "New!" })] }), nfcSupported ? (_jsxs("div", { className: "nav-link d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: ic_contactless, className: "d-flex me-1" }), _jsx("label", { title: "", htmlFor: "nfc", className: "form-check-label me-2", children: "NFC enable" }), _jsx(Form.Check // prettier-ignore
                                                    , { id: "nfc", type: "switch", onChange: (val) => nfcSet(val.target.checked, val.target), checked: nfcEnabled })] })) : ""] }), _jsxs(Nav, { className: "d-none d-lg-flex me-auto text-start", navbarScroll: true, style: { maxHeight: '100px' }, children: [_jsxs(Nav.Link, { href: "/", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: exchange, className: "d-flex me-1" }), _jsx("span", { children: "Swap" })] }), _jsxs(Nav.Link, { href: "/about", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: info, className: "d-flex me-1" }), _jsx("span", { children: "About" })] }), _jsxs(Nav.Link, { href: "/faq", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: question, className: "d-flex me-1" }), _jsx("span", { children: "FAQ" })] }), _jsxs(Nav.Link, { href: "/referral", onClick: navigateHref, className: "d-flex flex-column align-items-center", children: [_jsxs("div", { className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: gift, className: "d-flex me-1" }), _jsx("span", { className: "me-1", children: "Referral" })] }), _jsx(Badge, { className: "newBadge", children: "New!" })] }), nfcSupported ? (_jsxs("div", { className: "nav-link d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: ic_contactless, className: "d-flex me-1" }), _jsx("label", { title: "", htmlFor: "nfc", className: "form-check-label me-2", children: "NFC enable" }), _jsx(Form.Check // prettier-ignore
                                                    , { id: "nfc", type: "switch", onChange: (val) => nfcSet(val.target.checked, val.target), checked: nfcEnabled })] })) : ""] }), _jsx(Nav, { className: "ms-auto", children: _jsx("div", { className: "d-flex flex-row align-items-center", style: { height: "3rem" }, children: _jsx("div", { className: "d-flex ms-auto", children: _jsx(WalletMultiButton, { className: "bg-primary" }) }) }) })] })] }) }), _jsxs(SwapsContext.Provider, { value: {
                        actionableSwaps: [],
                        removeSwap: (swap) => {
                            // setActionableSwaps((val) => {
                            //     const cpy = [...val];
                            //     const i = cpy.indexOf(swap);
                            //     if(i>=0) cpy.splice(i, 1);
                            //     return cpy;
                            // });
                        },
                        chains: signers,
                        swapper,
                        getSigner: (swap) => {
                            if (swap == null)
                                return null;
                            if (isSCToken(swap)) {
                                if (signers[swap.chainId] == null)
                                    return undefined;
                                return signers[swap.chainId].signer;
                            }
                            else {
                                if (signers[swap.chainIdentifier] == null)
                                    return undefined;
                                if (signers[swap.chainIdentifier].random)
                                    return undefined;
                                if (signers[swap.chainIdentifier].signer.getAddress() !== swap.getInitiator())
                                    return null;
                                return signers[swap.chainIdentifier].signer;
                            }
                        }
                    }, children: [_jsxs("div", { className: "d-flex flex-grow-1 flex-column", children: [!noWalletPaths.has(pathName) && swapper == null ? (_jsx("div", { className: "no-wallet-overlay d-flex align-items-center", children: _jsx("div", { className: "mt-auto height-50 d-flex justify-content-center align-items-center flex-fill", children: _jsx("div", { className: "text-white text-center", children: swapperLoading ? (_jsx(_Fragment, { children: swapperLoadingError == null ? (_jsxs(_Fragment, { children: [_jsx(Spinner, {}), _jsx("h4", { children: "Connecting to atomiq network..." })] })) : (_jsx(_Fragment, { children: _jsx(ErrorAlert, { className: "d-flex flex-column align-items-center justify-content-center", title: "atomiq network connection error", error: swapperLoadingError }) })) })) : "" }) }) })) : "", _jsx(Routes, { children: _jsxs(Route, { path: "/", children: [_jsx(Route, { index: true, element: _jsx(SwapNew, { supportedCurrencies: smartChainTokenArray }) }), _jsxs(Route, { path: "scan", children: [_jsx(Route, { index: true, element: _jsx(QuickScan, {}) }), _jsx(Route, { path: "2", element: _jsx(QuickScanExecute, {}) })] }), _jsx(Route, { path: "history", element: _jsx(History, {}) }), _jsx(Route, { path: "gas", element: _jsx(SwapForGas, {}) }), _jsx(Route, { path: "faq", element: _jsx(FAQ, {}) }), _jsx(Route, { path: "about", element: _jsx(About, {}) }), _jsx(Route, { path: "map", element: _jsx(Map, {}) }), _jsx(Route, { path: "46jh456f45f", element: _jsx(SwapExplorer, {}) }), _jsx(Route, { path: "referral", element: _jsx(Affiliate, {}) })] }) })] }), _jsxs(Row, { className: "mt-auto bg-dark bg-opacity-50 g-0 p-2", style: { zIndex: 1000 }, children: [_jsxs(Col, { className: "d-flex flex-row", children: [_jsx("a", { href: "https://twitter.com/atomiqlabs", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/twitter.png" }) }), _jsx("a", { href: "https://github.com/adambor/SolLightning-readme", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/github.png" }) }), _jsx("a", { href: "https://docs.atomiq.exchange/", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/gitbook.png" }) })] }), affiliateLink != null && affiliateLink !== "" ? (_jsx(Col, { xs: "auto", className: "d-flex justify-content-center", children: _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "referral-tooltip", children: _jsx("span", { children: "Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!" }) }), children: _jsxs("div", { className: "font-small text-white opacity-75 d-flex align-items-center ", children: [_jsx(Icon, { icon: heart, className: "d-flex align-items-center me-1" }), _jsx("span", { className: "text-decoration-dotted", children: "Using referral link" })] }) }) })) : "", _jsx(Col, { className: "d-flex justify-content-end", children: _jsxs("a", { href: "https://t.me/+_MQNtlBXQ2Q1MGEy", target: "_blank", className: "ms-auto d-flex flex-row align-items-center text-white text-decoration-none hover-opacity-75 font-small", children: [_jsx("img", { className: "social-icon me-1", src: "/icons/socials/telegram.png" }), "Talk to us"] }) })] })] })] }) }));
}
function App() {
    return (_jsx("div", { className: "App d-flex flex-column", children: _jsx(SolanaWalletProvider, { children: _jsx(BrowserRouter, { children: _jsx(WrappedApp, {}) }) }) }));
}
export default App;
