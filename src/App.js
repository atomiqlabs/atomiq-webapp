import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import './App.css';
import { useContext, useEffect, useRef, useState } from 'react';
import { QuickScan } from './pages/quickscan/QuickScan';
import { QuickScanExecute } from './pages/quickscan/QuickScanExecute';
import { Factory, FEConstants } from './FEConstants';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SwapperContext } from './context/SwapperContext';
import { History } from './pages/History';
import { Spinner, } from 'react-bootstrap';
import { MainNavigation } from './components/layout/MainNavigation';
import { FAQ } from './pages/FAQ';
import { About } from './pages/About';
import { SwapForGas } from './pages/SwapForGas';
import { SwapExplorer } from './pages/SwapExplorer';
import { Affiliate } from './pages/Affiliate';
import { SwapNew } from './pages/SwapNew';
import { useAnchorNavigate } from './hooks/navigation/useAnchorNavigate';
import { ErrorAlert } from './components/_deprecated/ErrorAlert';
import { ChainsContext } from './context/ChainsContext';
import { ChainsProvider } from './providers/ChainsProvider';
import { SocialFooter } from './components/layout/SocialFooter';
require('@solana/wallet-adapter-react-ui/styles.css');
const noWalletPaths = new Set(['/about', '/faq', '/46jh456f45f']);
function WrappedApp() {
    const navigateHref = useAnchorNavigate();
    const [swapper, setSwapper] = useState();
    const [swapperLoadingError, setSwapperLoadingError] = useState();
    const [swapperLoading, setSwapperLoading] = useState(false);
    // @ts-ignore
    const pathName = window.location.pathname.split('?')[0];
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('affiliate')) {
        window.localStorage.setItem('atomiq-affiliate', searchParams.get('affiliate'));
    }
    const affiliateLink = searchParams.get('affiliate') || window.localStorage.getItem('atomiq-affiliate');
    const useLp = searchParams.get('UNSAFE_LP_URL') ?? FEConstants.defaultLp;
    const abortController = useRef();
    const chainsData = useContext(ChainsContext);
    const loadSwapper = async () => {
        setSwapperLoadingError(null);
        setSwapperLoading(true);
        if (abortController.current != null)
            abortController.current.abort();
        abortController.current = new AbortController();
        try {
            const swapper = Factory.newSwapper({
                chains: {
                    SOLANA: chainsData.chains.SOLANA?.swapperOptions,
                    STARKNET: chainsData.chains.STARKNET?.swapperOptions,
                },
                intermediaryUrl: useLp,
                getRequestTimeout: 15000,
                postRequestTimeout: 30000,
                bitcoinNetwork: FEConstants.bitcoinNetwork,
                pricingFeeDifferencePPM: 50000n,
                defaultAdditionalParameters: {
                    affiliate: affiliateLink,
                },
                mempoolApi: FEConstants.mempoolApi,
                defaultTrustedIntermediaryUrl: FEConstants.trustedGasSwapLp,
            });
            console.log('Swapper: ', swapper);
            await swapper.init();
            if (abortController.current.signal.aborted)
                return;
            console.log('Swapper initialized!');
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
    return (_jsxs(_Fragment, { children: [_jsxs(SwapperContext.Provider, { value: { swapper }, children: [_jsx(MainNavigation, { affiliateLink: affiliateLink }), _jsxs("div", { className: "d-flex flex-grow-1 flex-column mt-5", children: [!noWalletPaths.has(pathName) && swapper == null ? (_jsx("div", { className: "no-wallet-overlay d-flex align-items-center", children: _jsx("div", { className: "mt-auto height-50 d-flex justify-content-center align-items-center flex-fill", children: _jsx("div", { className: "text-white text-center", children: swapperLoading ? (_jsx(_Fragment, { children: swapperLoadingError == null ? (_jsxs(_Fragment, { children: [_jsx(Spinner, {}), _jsx("h4", { children: "Connecting to atomiq network..." })] })) : (_jsx(_Fragment, { children: _jsx(ErrorAlert, { className: "d-flex flex-column align-items-center justify-content-center", title: "atomiq network connection error", error: swapperLoadingError }) })) })) : ('') }) }) })) : (''), _jsx(Routes, { children: _jsxs(Route, { path: "/", children: [_jsx(Route, { index: true, element: _jsx(SwapNew, {}) }), _jsxs(Route, { path: "scan", children: [_jsx(Route, { index: true, element: _jsx(QuickScan, {}) }), _jsx(Route, { path: "2", element: _jsx(QuickScanExecute, {}) })] }), _jsx(Route, { path: "history", element: _jsx(History, {}) }), _jsx(Route, { path: "gas", element: _jsx(SwapForGas, {}) }), _jsx(Route, { path: "faq", element: _jsx(FAQ, {}) }), _jsx(Route, { path: "about", element: _jsx(About, {}) }), _jsx(Route, { path: "46jh456f45f", element: _jsx(SwapExplorer, {}) }), _jsx(Route, { path: "referral", element: _jsx(Affiliate, {}) })] }) })] })] }), _jsx(SocialFooter, { affiliateLink: affiliateLink })] }));
}
function App() {
    return (_jsx("div", { className: "App d-flex flex-column", children: _jsx(ChainsProvider, { children: _jsx(BrowserRouter, { children: _jsx(WrappedApp, {}) }) }) }));
}
export default App;
