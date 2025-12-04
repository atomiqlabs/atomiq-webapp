import './App.css';
import {useContext, useEffect, useRef, useState} from "react";
import {QuickScan} from "./pages/quickscan/QuickScan";
import {QuickScanExecute} from "./pages/quickscan/QuickScanExecute";
import {Factory, FEConstants} from "./FEConstants";
import {smartChainTokenArray} from "./tokens/Tokens";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SwapsContext} from "./swaps/context/SwapsContext";
import {
    BitcoinNetwork,
    Swapper,
} from "@atomiqlabs/sdk";
import {History} from "./pages/History";
import {Badge, Col, Container, Nav, Navbar, OverlayTrigger, Row, Spinner, Tooltip} from "react-bootstrap";
import {FAQ} from "./pages/FAQ";
import {About} from "./pages/About";
import {info} from 'react-icons-kit/fa/info';
import {question} from 'react-icons-kit/fa/question';
import {exchange} from 'react-icons-kit/fa/exchange';
import Icon from "react-icons-kit";
import {SwapForGas} from "./pages/SwapForGas";
import {SwapExplorer} from "./pages/SwapExplorer";
import {Affiliate} from "./pages/Affiliate";
import {heart} from 'react-icons-kit/fa/heart';
import {SwapNew} from "./pages/SwapNew";
import {useAnchorNavigate} from "./utils/hooks/useAnchorNavigate";
import {ErrorAlert} from "./components/ErrorAlert";
import {WalletConnectionsSummary} from "./wallets/WalletConnectionsSummary";
import {NFCSwitch} from "./nfc/NFCSwitch";
import {ChainDataContext} from "./wallets/context/ChainDataContext";
import {ChainDataProvider} from "./wallets/ChainDataProvider";

require('@solana/wallet-adapter-react-ui/styles.css');

const noWalletPaths = new Set(["/about", "/faq", "/46jh456f45f"]);

global.atomiqLogLevel = 5;

function WrappedApp() {
    const navigateHref = useAnchorNavigate();

    const [swapper, setSwapper] = useState<Swapper<any>>();
    const [swapperLoadingError, setSwapperLoadingError] = useState<any>();
    const [swapperLoading, setSwapperLoading] = useState<boolean>(false);

    // @ts-ignore
    const pathName = window.location.pathname.split("?")[0];

    const searchParams = new URLSearchParams(window.location.search);
    if(searchParams.has("affiliate")) {
        window.localStorage.setItem("atomiq-affiliate", searchParams.get("affiliate"));
    }
    const affiliateLink = searchParams.get("affiliate") || window.localStorage.getItem("atomiq-affiliate");
    const useLp = searchParams.get("UNSAFE_LP_URL") ?? FEConstants.defaultLp;

    const abortController = useRef<AbortController>();

    const chainsData = useContext(ChainDataContext);
    const loadSwapper: () => Promise<Swapper<any>> = async() => {
        setSwapperLoadingError(null);
        setSwapperLoading(true);
        if(abortController.current!=null) abortController.current.abort();
        abortController.current = new AbortController();
        try {
            console.log("App: loadSwapper(): init start");

            const swapper = Factory.newSwapper({
                chains: {
                    SOLANA: chainsData.SOLANA?.swapperOptions,
                    STARKNET: chainsData.STARKNET?.swapperOptions,
                    CITREA: chainsData.CITREA?.swapperOptions,
                    BOTANIX: chainsData.BOTANIX?.swapperOptions,
                    ALPEN: chainsData.ALPEN?.swapperOptions,
                    GOAT: chainsData.GOAT?.swapperOptions
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
            if(abortController.current.signal.aborted) return;

            console.log("App: loadSwapper(): Swapper initialized!");

            setSwapper(swapper);
            setSwapperLoading(false);

            return swapper;
        } catch (e) {
            setSwapperLoadingError(e);
            console.error(e);
        }
    };

    useEffect(() => {
        if(!noWalletPaths.has(pathName) && swapper==null) loadSwapper();
    }, [pathName]);

    const navTabs = (<>
        <Nav.Link href="/" onClick={navigateHref} className="d-flex flex-row align-items-center"><Icon icon={exchange} className="d-flex me-1"/><span>Swap</span></Nav.Link>
        <Nav.Link href="/about" onClick={navigateHref} className="d-flex flex-row align-items-center"><Icon icon={info} className="d-flex me-1"/><span>About</span></Nav.Link>
        <Nav.Link href="/faq" onClick={navigateHref} className="d-flex flex-row align-items-center"><Icon icon={question} className="d-flex me-1"/><span>FAQ</span></Nav.Link>
        <NFCSwitch/>
    </>);

    return (
        <>
            <Navbar collapseOnSelect expand="lg " bg="dark" variant="dark" className="bg-dark bg-opacity-50" style={{zIndex: 1000, minHeight: "64px"}}>
                <Container className="max-width-100">
                    <Navbar.Brand href="/" className="d-flex flex-column">
                        <div className="d-flex flex-row" style={{fontSize: "1.5rem"}}>
                            <img src="/icons/atomiq-flask.png" className="logo-img"/>
                            <b>atomiq</b><span className={"d-sm-block " + (FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? "d-none" : "")} style={{fontWeight: 300}}>.exchange</span>
                            {FEConstants.bitcoinNetwork!==BitcoinNetwork.MAINNET ? <Badge className="ms-2 d-flex align-items-center" bg="danger">{FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET4 ? "TESTNET4" : "TESTNET"}</Badge> : ""}
                        </div>
                    </Navbar.Brand>

                    <div className="d-flex flex-column">
                        <Navbar.Toggle aria-controls="basic-navbar-nav" className="ms-3" />
                    </div>

                    <Navbar.Collapse role="" id="basic-navbar-nav">
                        <Nav className={"d-flex d-lg-none me-auto text-start border-top border-dark-subtle my-2 "+(swapper==null ? "" : "border-bottom")}>
                            {navTabs}
                        </Nav>
                        <Nav className="d-none d-lg-flex me-auto text-start" navbarScroll style={{ maxHeight: '100px' }}>
                            {navTabs}
                        </Nav>
                        <Nav className="ms-auto">
                            <div className="pt-2 ms-auto" style={{height: "3rem"}}>
                                <WalletConnectionsSummary/>
                            </div>
                        </Nav>
                    </Navbar.Collapse>

                </Container>
            </Navbar>

            <SwapsContext.Provider value={{swapper}}>
                <div className="d-flex flex-grow-1 flex-column">
                    {!noWalletPaths.has(pathName) && swapper==null ? (
                        <div className="no-wallet-overlay d-flex align-items-center">
                            <div className="mt-auto height-50 d-flex justify-content-center align-items-center flex-fill">
                                <div className="text-white text-center">
                                    {swapperLoading ? (
                                        <>
                                            {swapperLoadingError==null ? (
                                                <>
                                                    <Spinner/>
                                                    <h4>Connecting to atomiq network...</h4>
                                                </>
                                            ) : (
                                                <>
                                                    <ErrorAlert
                                                        className="d-flex flex-column align-items-center justify-content-center"
                                                        title="atomiq network connection error"
                                                        error={swapperLoadingError}
                                                    />
                                                </>
                                            )}
                                        </>
                                    ) : ""}
                                </div>
                            </div>
                        </div>
                    ) : ""}
                    <Routes>
                        <Route path="/">
                            <Route index element={<SwapNew supportedCurrencies={smartChainTokenArray}/>}></Route>
                            <Route path="scan">
                                <Route index element={<QuickScan/>}/>
                                <Route path="2" element={<QuickScanExecute/>}/>
                            </Route>
                            <Route path="history" element={<History/>}/>
                            <Route path="gas" element={<SwapForGas/>}/>
                            <Route path="faq" element={<FAQ/>}/>
                            <Route path="about" element={<About/>}/>
                            <Route path="46jh456f45f" element={<SwapExplorer/>}/>
                            <Route path="referral" element={<Affiliate/>}/>
                        </Route>
                    </Routes>
                </div>
            </SwapsContext.Provider>

            <Row className="mt-auto bg-dark bg-opacity-50 g-0 p-2" style={{zIndex: 1000}}>

                <Col className="d-flex flex-row">
                    <a href="https://t.me/+_MQNtlBXQ2Q1MGEy" target="_blank"
                       className="mx-2 hover-opacity-75 d-flex align-items-center">
                        <img className="social-icon" src="/icons/socials/telegram.png"/>
                    </a>
                    <a href="https://twitter.com/atomiqlabs" target="_blank"
                       className="mx-2 hover-opacity-75 d-flex align-items-center">
                        <img className="social-icon" src="/icons/socials/twitter.png"/>
                    </a>
                    <a href="https://github.com/atomiqlabs" target="_blank"
                       className="mx-2 hover-opacity-75 d-flex align-items-center">
                        <img className="social-icon" src="/icons/socials/github.png"/>
                    </a>
                    <a href="https://docs.atomiq.exchange/" target="_blank"
                       className="mx-2 hover-opacity-75 d-flex align-items-center">
                        <img className="social-icon" src="/icons/socials/gitbook.png"/>
                    </a>
                </Col>

                {affiliateLink != null && affiliateLink !== "" ? (
                    <Col xs={"auto"} className="d-flex justify-content-center">
                        <OverlayTrigger overlay={<Tooltip id="referral-tooltip">
                            <span>Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!</span>
                        </Tooltip>}>
                            <div className="font-small text-white opacity-75 d-flex align-items-center ">
                                <Icon icon={heart} className="d-flex align-items-center me-1"/><span className="text-decoration-dotted">Using referral link</span>
                            </div>
                        </OverlayTrigger>
                    </Col>
                ) : ""}

                <Col className="d-flex justify-content-end">
                    <a href="https://t.me/atomiq_support" target="_blank" className="ms-auto d-flex flex-row align-items-center text-white text-decoration-none hover-opacity-75 font-small">
                        <img className="social-icon me-1" src="/icons/socials/telegram.png"/>Talk to support
                    </a>
                </Col>
            </Row>
        </>
    )
}

function App() {
    return (
        <div className="App d-flex flex-column">
            <ChainDataProvider>
                <BrowserRouter>
                    <WrappedApp/>
                </BrowserRouter>
            </ChainDataProvider>
        </div>
    );
}

export default App;
