import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import './App.css';
import { useContext, useEffect, useRef, useState } from "react";
import { QuickScan } from "./pages/quickscan/QuickScan";
import { QuickScanExecute } from "./pages/quickscan/QuickScanExecute";
import { Factory, FEConstants } from "./FEConstants";
import { smartChainTokenArray } from "./tokens/Tokens";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SwapsContext } from "./swaps/context/SwapsContext";
import { BitcoinNetwork, } from "@atomiqlabs/sdk";
import { History } from "./pages/History";
import { Badge, Col, Container, Nav, Navbar, OverlayTrigger, Row, Spinner, Tooltip } from "react-bootstrap";
import { FAQ } from "./pages/FAQ";
import { About } from "./pages/About";
import { info } from 'react-icons-kit/fa/info';
import { question } from 'react-icons-kit/fa/question';
import { exchange } from 'react-icons-kit/fa/exchange';
import Icon from "react-icons-kit";
import { SwapForGas } from "./pages/SwapForGas";
import { SwapExplorer } from "./pages/SwapExplorer";
import { Affiliate } from "./pages/Affiliate";
import { heart } from 'react-icons-kit/fa/heart';
import { SwapNew } from "./pages/SwapNew";
import { useAnchorNavigate } from "./utils/hooks/useAnchorNavigate";
import { ErrorAlert } from "./components/ErrorAlert";
import { WalletConnectionsSummary } from "./wallets/WalletConnectionsSummary";
import { NFCSwitch } from "./nfc/NFCSwitch";
import { ChainDataContext } from "./wallets/context/ChainDataContext";
import { ChainDataProvider } from "./wallets/ChainDataProvider";
require('@solana/wallet-adapter-react-ui/styles.css');
const noWalletPaths = new Set(["/about", "/faq", "/46jh456f45f"]);
global.atomiqLogLevel = 5;
function WrappedApp() {
    const navigateHref = useAnchorNavigate();
    const [swapper, setSwapper] = useState();
    const [swapperLoadingError, setSwapperLoadingError] = useState();
    const [swapperLoading, setSwapperLoading] = useState(false);
    // @ts-ignore
    const pathName = window.location.pathname.split("?")[0];
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("affiliate")) {
        window.localStorage.setItem("atomiq-affiliate", searchParams.get("affiliate"));
    }
    const affiliateLink = searchParams.get("affiliate") || window.localStorage.getItem("atomiq-affiliate");
    const useLp = searchParams.get("UNSAFE_LP_URL") ?? FEConstants.defaultLp;
    const abortController = useRef();
    const chainsData = useContext(ChainDataContext);
    const loadSwapper = async () => {
        setSwapperLoadingError(null);
        setSwapperLoading(true);
        if (abortController.current != null)
            abortController.current.abort();
        abortController.current = new AbortController();
        try {
            console.log("App: loadSwapper(): init start");
            const swapper = Factory.newSwapper({
                chains: {
                    SOLANA: chainsData.SOLANA?.swapperOptions,
                    STARKNET: chainsData.STARKNET?.swapperOptions,
                    CITREA: chainsData.CITREA?.swapperOptions,
                    BOTANIX: chainsData.BOTANIX?.swapperOptions,
                    ALPEN: chainsData.ALPEN?.swapperOptions
                },
                intermediaryUrl: useLp,
                getRequestTimeout: 15000,
                postRequestTimeout: 30000,
                bitcoinNetwork: FEConstants.bitcoinNetwork,
                pricingFeeDifferencePPM: 50000n,
                defaultAdditionalParameters: {
                    affiliate: affiliateLink,
                    feeOverrideCode: "frontend"
                },
                mempoolApi: FEConstants.mempoolApi,
                defaultTrustedIntermediaryUrl: FEConstants.trustedGasSwapLp,
                automaticClockDriftCorrection: true
            });
            console.log("App: loadSwapper(): Swapper: ", swapper);
            await swapper.init();
            if (abortController.current.signal.aborted)
                return;
            console.log("App: loadSwapper(): Swapper initialized!");
            setSwapper(swapper);
            setSwapperLoading(false);
            return swapper;
        }
        catch (e) {
            setSwapperLoadingError(e);
            console.error(e);
        }
    };
    useEffect(() => {
        if (!noWalletPaths.has(pathName) && swapper == null)
            loadSwapper();
    }, [pathName]);
    const navTabs = (_jsxs(_Fragment, { children: [_jsxs(Nav.Link, { href: "/", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: exchange, className: "d-flex me-1" }), _jsx("span", { children: "Swap" })] }), _jsxs(Nav.Link, { href: "/about", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: info, className: "d-flex me-1" }), _jsx("span", { children: "About" })] }), _jsxs(Nav.Link, { href: "/faq", onClick: navigateHref, className: "d-flex flex-row align-items-center", children: [_jsx(Icon, { icon: question, className: "d-flex me-1" }), _jsx("span", { children: "FAQ" })] }), _jsx(NFCSwitch, {})] }));
    return (_jsxs(_Fragment, { children: [_jsx(Navbar, { collapseOnSelect: true, expand: "lg ", bg: "dark", variant: "dark", className: "bg-dark bg-opacity-50", style: { zIndex: 1000, minHeight: "64px" }, children: _jsxs(Container, { className: "max-width-100", children: [_jsx(Navbar.Brand, { href: "/", className: "d-flex flex-column", children: _jsxs("div", { className: "d-flex flex-row", style: { fontSize: "1.5rem" }, children: [_jsx("img", { src: "/icons/atomiq-flask.png", className: "logo-img" }), _jsx("b", { children: "atomiq" }), _jsx("span", { className: "d-sm-block " + (FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? "d-none" : ""), style: { fontWeight: 300 }, children: ".exchange" }), FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? _jsx(Badge, { className: "ms-2 d-flex align-items-center", bg: "danger", children: FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET4 ? "TESTNET4" : "TESTNET" }) : ""] }) }), _jsx("div", { className: "d-flex flex-column", children: _jsx(Navbar.Toggle, { "aria-controls": "basic-navbar-nav", className: "ms-3" }) }), _jsxs(Navbar.Collapse, { role: "", id: "basic-navbar-nav", children: [_jsx(Nav, { className: "d-flex d-lg-none me-auto text-start border-top border-dark-subtle my-2 " + (swapper == null ? "" : "border-bottom"), children: navTabs }), _jsx(Nav, { className: "d-none d-lg-flex me-auto text-start", navbarScroll: true, style: { maxHeight: '100px' }, children: navTabs }), _jsx(Nav, { className: "ms-auto", children: _jsx("div", { className: "pt-2 ms-auto", style: { height: "3rem" }, children: _jsx(WalletConnectionsSummary, {}) }) })] })] }) }), _jsx(SwapsContext.Provider, { value: { swapper }, children: _jsxs("div", { className: "d-flex flex-grow-1 flex-column", children: [!noWalletPaths.has(pathName) && swapper == null ? (_jsx("div", { className: "no-wallet-overlay d-flex align-items-center", children: _jsx("div", { className: "mt-auto height-50 d-flex justify-content-center align-items-center flex-fill", children: _jsx("div", { className: "text-white text-center", children: swapperLoading ? (_jsx(_Fragment, { children: swapperLoadingError == null ? (_jsxs(_Fragment, { children: [_jsx(Spinner, {}), _jsx("h4", { children: "Connecting to atomiq network..." })] })) : (_jsx(_Fragment, { children: _jsx(ErrorAlert, { className: "d-flex flex-column align-items-center justify-content-center", title: "atomiq network connection error", error: swapperLoadingError }) })) })) : "" }) }) })) : "", _jsx(Routes, { children: _jsxs(Route, { path: "/", children: [_jsx(Route, { index: true, element: _jsx(SwapNew, { supportedCurrencies: smartChainTokenArray }) }), _jsxs(Route, { path: "scan", children: [_jsx(Route, { index: true, element: _jsx(QuickScan, {}) }), _jsx(Route, { path: "2", element: _jsx(QuickScanExecute, {}) })] }), _jsx(Route, { path: "history", element: _jsx(History, {}) }), _jsx(Route, { path: "gas", element: _jsx(SwapForGas, {}) }), _jsx(Route, { path: "faq", element: _jsx(FAQ, {}) }), _jsx(Route, { path: "about", element: _jsx(About, {}) }), _jsx(Route, { path: "46jh456f45f", element: _jsx(SwapExplorer, {}) }), _jsx(Route, { path: "referral", element: _jsx(Affiliate, {}) })] }) })] }) }), _jsxs(Row, { className: "mt-auto bg-dark bg-opacity-50 g-0 p-2", style: { zIndex: 1000 }, children: [_jsxs(Col, { className: "d-flex flex-row", children: [_jsx("a", { href: "https://t.me/+_MQNtlBXQ2Q1MGEy", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/telegram.png" }) }), _jsx("a", { href: "https://twitter.com/atomiqlabs", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/twitter.png" }) }), _jsx("a", { href: "https://github.com/atomiqlabs", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/github.png" }) }), _jsx("a", { href: "https://docs.atomiq.exchange/", target: "_blank", className: "mx-2 hover-opacity-75 d-flex align-items-center", children: _jsx("img", { className: "social-icon", src: "/icons/socials/gitbook.png" }) })] }), affiliateLink != null && affiliateLink !== "" ? (_jsx(Col, { xs: "auto", className: "d-flex justify-content-center", children: _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "referral-tooltip", children: _jsx("span", { children: "Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!" }) }), children: _jsxs("div", { className: "font-small text-white opacity-75 d-flex align-items-center ", children: [_jsx(Icon, { icon: heart, className: "d-flex align-items-center me-1" }), _jsx("span", { className: "text-decoration-dotted", children: "Using referral link" })] }) }) })) : "", _jsx(Col, { className: "d-flex justify-content-end", children: _jsxs("a", { href: "https://t.me/atomiq_support", target: "_blank", className: "ms-auto d-flex flex-row align-items-center text-white text-decoration-none hover-opacity-75 font-small", children: [_jsx("img", { className: "social-icon me-1", src: "/icons/socials/telegram.png" }), "Talk to support"] }) })] })] }));
}
function App() {
    return (_jsx("div", { className: "App d-flex flex-column", children: _jsx(ChainDataProvider, { children: _jsx(BrowserRouter, { children: _jsx(WrappedApp, {}) }) }) }));
}
export default App;
