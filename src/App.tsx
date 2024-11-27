import './App.css';
import * as React from "react";
import {useCallback, useEffect, useRef} from "react";
import SolanaWalletProvider from "./context/SolanaWalletProvider";
import {QuickScan} from "./pages/quickscan/QuickScan";
import {QuickScanExecute} from "./pages/quickscan/QuickScanExecute";
import {useAnchorWallet, useConnection} from '@solana/wallet-adapter-react';
import {FEConstants} from "./FEConstants";
import {smartChainTokenArray} from "./utils/Currencies";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SwapsContext} from "./context/SwapsContext";
import {
    AbstractSigner,
    BitcoinNetwork, isSCToken,
    ISwap,
    MultichainSwapper,
    SCToken,
    SolanaFees,
    SolanaSigner
} from "@atomiqlabs/sdk";
import {History} from "./pages/History";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {
    Alert,
    Badge,
    Button,
    Col,
    Container,
    Form,
    Nav,
    Navbar,
    OverlayTrigger,
    Row,
    Spinner,
    Tooltip
} from "react-bootstrap";
import {FAQ} from "./pages/FAQ";
import {About} from "./pages/About";
import {Map} from "./pages/Map";
import {map} from 'react-icons-kit/fa/map';
import {info} from 'react-icons-kit/fa/info';
import {question} from 'react-icons-kit/fa/question';
import {exchange} from 'react-icons-kit/fa/exchange';
import Icon from "react-icons-kit";
import * as BN from "bn.js";
import {LNNFCReader, LNNFCStartResult} from './lnnfc/LNNFCReader';
import {ic_contactless} from 'react-icons-kit/md/ic_contactless';
import {SwapForGas} from "./pages/SwapForGas";
import {SwapExplorer} from "./pages/SwapExplorer";
import {Affiliate} from "./pages/Affiliate";
import {gift} from 'react-icons-kit/fa/gift';
import {BitcoinWallet} from './bitcoin/onchain/BitcoinWallet';
import {BitcoinWalletContext} from './context/BitcoinWalletContext';
import {WebLNProvider} from "webln";
import {WebLNContext} from './context/WebLNContext';
import {heart} from 'react-icons-kit/fa/heart';
import {SwapNew} from "./pages/SwapNew";

require('@solana/wallet-adapter-react-ui/styles.css');

const noWalletPaths = new Set(["/about", "/faq", "/map", "/46jh456f45f"]);
const jitoPubkey = "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL";
const jitoEndpoint = "https://mainnet.block-engine.jito.wtf/api/v1/transactions";

function WrappedApp() {

    const {connection} = useConnection();

    const [swapper, setSwapper] = React.useState<MultichainSwapper>();
    const [swapperLoadingError, setSwapperLoadingError] = React.useState<string>();
    const [swapperLoading, setSwapperLoading] = React.useState<boolean>(false);

    const [signers, setSigners] = React.useState<{
        [chainId: string]: {
            signer: AbstractSigner,
            random: boolean
        }
    }>({});
    const solanaWallet = useAnchorWallet();
    useEffect(() => {
        if(swapper==null) return;
        setSigners((prevValue) => {
            return {...prevValue,SOLANA: {signer: solanaWallet==null ? swapper.randomSigner("SOLANA") : new SolanaSigner(solanaWallet), random: solanaWallet==null}};
        });
    }, [solanaWallet, swapper]);

    // @ts-ignore
    const pathName = window.location.pathname.split("?")[0];

    const searchParams = new URLSearchParams(window.location.search);
    if(searchParams.has("affiliate")) {
        window.localStorage.setItem("atomiq-affiliate", searchParams.get("affiliate"));
    }

    const affiliateLink = searchParams.get("affiliate") || window.localStorage.getItem("atomiq-affiliate");

    const swapListener = useCallback((swap: ISwap) => {
        if(swap.isFinished()) {
            //TODO: Change this to support multiple signers
            // setActionableSwaps((val: ISwap[]) => val.filter(e => e!==swap));
        }
    }, []);
    const abortController = useRef<AbortController>();

    const loadSwapper: () => Promise<MultichainSwapper> = async() => {
        setSwapperLoadingError(null);
        setSwapperLoading(true);
        if(abortController.current!=null) abortController.current.abort();
        abortController.current = new AbortController();
        try {
            const useLp = searchParams.get("UNSAFE_LP_URL");
            console.log("init start");

            // const connection = new Connection(FEConstants.rpcUrl);

            const solanaFees = new SolanaFees(connection as any, 250000, 2, 100, "auto", () => new BN(25000)/*, {
                address: jitoPubkey,
                endpoint: jitoEndpoint,
                getStaticFee:() => new BN(250000)
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
                bitcoinNetwork: FEConstants.chain==="DEVNET" ? BitcoinNetwork.TESTNET : BitcoinNetwork.MAINNET,
                pricingFeeDifferencePPM: new BN(50000),
                defaultAdditionalParameters: {
                    affiliate: affiliateLink
                }
            });

            await swapper.init();
            if(abortController.current.signal.aborted) return;

            console.log(swapper);
            console.log("Swapper initialized, getting claimable swaps...");

            setSwapper(swapper);
            setSwapperLoading(false);
            setSigners((prevValue) => {
                const cpy = {...prevValue};
                for(let chainId of swapper.getChains()) {
                    if(cpy[chainId]==null) cpy[chainId] = {signer: swapper.randomSigner(chainId), random: true};
                }
                return cpy;
            });

            swapper.on("swapState", swapListener);

            return swapper;
        } catch (e) {
            setSwapperLoadingError(e.toString());
            console.error(e)
        }
    };

    React.useEffect(() => {
        return () => {
            if(swapper!=null) {
                swapper.off("swapState", swapListener);
            }
        }
    }, [swapper]);

    React.useEffect(() => {
        if(!noWalletPaths.has(pathName)) loadSwapper();
    }, []);

    const [nfcSupported, setNfcSupported] = React.useState<boolean>(false);
    const [nfcEnabled, setNfcEnabled] = React.useState<boolean>(true);

    React.useEffect(() => {
        setNfcSupported(LNNFCReader.isSupported());
        setNfcEnabled(!LNNFCReader.isUserDisabled());
    }, []);

    const nfcSet = (val: boolean, target: any) => {
        console.log("NFC set: ", val);
        if(val===true) {
            const reader = new LNNFCReader();
            reader.start(true).then(resp => {
                console.log("start response: ", resp);
                if(resp===LNNFCStartResult.OK) {
                    setNfcEnabled(true);
                    target.checked = true;
                    reader.stop();
                }
            })
        }
        if(val===false) {
            setNfcEnabled(false);
            target.checked = false;
            LNNFCReader.userDisable();
            console.log("Set nfc disabled: ", val);
        }
    };

    console.log("nfcDisabled: ", nfcEnabled);

    const [bitcoinWallet, setBitcoinWallet] = React.useState<BitcoinWallet>();
    const [webLNWallet, setWebLNWallet] = React.useState<WebLNProvider>();

    return (
        <BitcoinWalletContext.Provider value={{
            bitcoinWallet: bitcoinWallet,
            setBitcoinWallet: (wallet: BitcoinWallet) => {
                if(wallet==null) BitcoinWallet.clearState();
                setBitcoinWallet(wallet);
            }
        }}>
            <WebLNContext.Provider value={{
                lnWallet: webLNWallet,
                setLnWallet: setWebLNWallet
            }}>
                <Navbar collapseOnSelect expand="lg " bg="dark" variant="dark" className="bg-dark bg-opacity-50" style={{zIndex: 1000, minHeight: "64px"}}>
                    <Container className="max-width-100">
                        <Navbar.Brand href="/" className="d-flex flex-column">
                            <div className="d-flex flex-row" style={{fontSize: "1.5rem"}}>
                                <img src="/icons/atomiq-flask.png" className="logo-img"/>
                                <b>atomiq</b><span style={{fontWeight: 300}}>.exchange</span>
                                {(FEConstants.chain as string)==="DEVNET" ? <Badge className="ms-2 d-flex align-items-center" bg="danger">DEVNET</Badge> : ""}
                            </div>
                        </Navbar.Brand>

                        <div className="d-flex flex-column">
                            <Badge className="newBadgeCollapse d-lg-none">New!</Badge>
                            <Navbar.Toggle aria-controls="basic-navbar-nav" className="ms-3" />
                        </div>

                        <Navbar.Collapse role="" id="basic-navbar-nav">
                            <Nav className={"d-flex d-lg-none me-auto text-start border-top border-dark-subtle my-2 "+(swapper==null ? "" : "border-bottom")}>
                                <Nav.Link href="/" className="d-flex flex-row align-items-center"><Icon icon={exchange} className="d-flex me-1"/><span>Swap</span></Nav.Link>
                                {/*<Nav.Link href="/map" className="d-flex flex-row align-items-center">*/}
                                {/*    <Icon icon={map} className="d-flex me-1"/>*/}
                                {/*    <span className="me-auto">Map</span>*/}
                                {/*    <small>Find merchants accepting lightning!</small>*/}
                                {/*</Nav.Link>*/}
                                <Nav.Link href="/about" className="d-flex flex-row align-items-center"><Icon icon={info} className="d-flex me-1"/><span>About</span></Nav.Link>
                                <Nav.Link href="/faq" className="d-flex flex-row align-items-center"><Icon icon={question} className="d-flex me-1"/><span>FAQ</span></Nav.Link>
                                <Nav.Link href="/referral" className="d-flex flex-row align-items-center">
                                    <Icon icon={gift} className="d-flex me-1"/>
                                    <span className="me-1">Referral</span>
                                    <Badge className="me-2">New!</Badge>
                                </Nav.Link>
                                {nfcSupported ? (
                                    <div className="nav-link d-flex flex-row align-items-center">
                                        <Icon icon={ic_contactless} className="d-flex me-1"/>
                                        <label title="" htmlFor="nfc" className="form-check-label me-2">NFC enable</label>
                                        <Form.Check // prettier-ignore
                                            id="nfc"
                                            type="switch"
                                            onChange={(val) => nfcSet(val.target.checked, val.target)}
                                            checked={nfcEnabled}
                                        />
                                    </div>
                                ) : ""}
                                {/*<Nav.Link href="https://github.com/adambor/SolLightning-sdk" target="_blank">Integrate</Nav.Link>*/}
                            </Nav>
                            <Nav className="d-none d-lg-flex me-auto text-start" navbarScroll style={{ maxHeight: '100px' }}>
                                <Nav.Link href="/" className="d-flex flex-row align-items-center"><Icon icon={exchange} className="d-flex me-1"/><span>Swap</span></Nav.Link>

                                {/*<OverlayTrigger placement="bottom" overlay={<Tooltip id="map-tooltip">*/}
                                {/*    Find merchants near you accepting bitcoin lightning!*/}
                                {/*</Tooltip>}>*/}
                                {/*    <Nav.Link href="/map" className="d-flex flex-row align-items-center">*/}
                                {/*        <Icon icon={map} className="d-flex me-1"/>*/}
                                {/*        <span>Map</span>*/}
                                {/*    </Nav.Link>*/}
                                {/*</OverlayTrigger>*/}

                                <Nav.Link href="/about" className="d-flex flex-row align-items-center"><Icon icon={info} className="d-flex me-1"/><span>About</span></Nav.Link>
                                <Nav.Link href="/faq" className="d-flex flex-row align-items-center"><Icon icon={question} className="d-flex me-1"/><span>FAQ</span></Nav.Link>

                                <Nav.Link href="/referral" className="d-flex flex-column align-items-center">
                                    <div className="d-flex flex-row align-items-center">
                                        <Icon icon={gift} className="d-flex me-1"/>
                                        <span className="me-1">Referral</span>
                                    </div>
                                    <Badge className="newBadge">New!</Badge>
                                </Nav.Link>

                                {nfcSupported ? (
                                    <div className="nav-link d-flex flex-row align-items-center">
                                        <Icon icon={ic_contactless} className="d-flex me-1"/>
                                        <label title="" htmlFor="nfc" className="form-check-label me-2">NFC enable</label>
                                        <Form.Check // prettier-ignore
                                            id="nfc"
                                            type="switch"
                                            onChange={(val) => nfcSet(val.target.checked, val.target)}
                                            checked={nfcEnabled}
                                        />
                                    </div>
                                ) : ""}
                                {/*<Nav.Link href="https://github.com/adambor/SolLightning-sdk" target="_blank">Integrate</Nav.Link>*/}
                            </Nav>
                            <Nav className="ms-auto">
                                <div className="d-flex flex-row align-items-center" style={{height: "3rem"}}>
                                    <div className="d-flex ms-auto">
                                        <WalletMultiButton className="bg-primary"/>
                                    </div>
                                </div>
                            </Nav>
                        </Navbar.Collapse>

                    </Container>
                </Navbar>

                <SwapsContext.Provider value={{
                    actionableSwaps: [],
                    removeSwap: (swap: ISwap) => {
                        // setActionableSwaps((val) => {
                        //     const cpy = [...val];
                        //     const i = cpy.indexOf(swap);
                        //     if(i>=0) cpy.splice(i, 1);
                        //     return cpy;
                        // });
                    },
                    chains: signers,
                    swapper,
                    getSigner: (swap: ISwap | SCToken) => {
                        if(swap==null) return null;
                        if(isSCToken(swap)) {
                            if(signers[swap.chainId]==null) return undefined;
                            return signers[swap.chainId].signer;
                        } else {
                            if(signers[swap.chainIdentifier]==null) return undefined;
                            if(signers[swap.chainIdentifier].random) return undefined;
                            if(signers[swap.chainIdentifier].signer.getAddress()!==swap.getInitiator()) return null;
                            return signers[swap.chainIdentifier].signer;
                        }
                    }
                }}>
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
                                                        <Alert className="text-center d-flex flex-column align-items-center justify-content-center" show={true} variant="danger" closeVariant="white">
                                                            <strong>atomiq network connection error</strong>
                                                            <p>{swapperLoadingError}</p>
                                                            <Button variant="light" onClick={() => {
                                                                loadSwapper()
                                                            }}>Retry</Button>
                                                        </Alert>
                                                    </>
                                                )}
                                            </>
                                        ) : ""}
                                    </div>
                                </div>
                            </div>
                        ) : ""}
                        <BrowserRouter>
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
                                    <Route path="map" element={<Map/>}/>
                                    <Route path="46jh456f45f" element={<SwapExplorer/>}/>
                                    <Route path="referral" element={<Affiliate/>}/>
                                </Route>
                            </Routes>
                        </BrowserRouter>
                    </div>
                    <Row className="mt-auto bg-dark bg-opacity-50 g-0 p-2" style={{zIndex: 1000}}>

                        <Col className="d-flex flex-row">
                            <a href="https://twitter.com/atomiqlabs" target="_blank" className="mx-2 hover-opacity-75 d-flex align-items-center"><img className="social-icon" src="/icons/socials/twitter.png"/></a>
                            <a href="https://github.com/adambor/SolLightning-readme" target="_blank" className="mx-2 hover-opacity-75 d-flex align-items-center"><img className="social-icon" src="/icons/socials/github.png"/></a>
                            <a href="https://docs.atomiq.exchange/" target="_blank" className="mx-2 hover-opacity-75 d-flex align-items-center"><img className="social-icon" src="/icons/socials/gitbook.png"/></a>
                        </Col>

                        {affiliateLink!=null && affiliateLink!=="" ? (
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
                            <a href="https://t.me/+_MQNtlBXQ2Q1MGEy" target="_blank" className="ms-auto d-flex flex-row align-items-center text-white text-decoration-none hover-opacity-75 font-small">
                                <img className="social-icon me-1" src="/icons/socials/telegram.png"/>Talk to us
                            </a>
                        </Col>
                    </Row>
                </SwapsContext.Provider>
            </WebLNContext.Provider>
        </BitcoinWalletContext.Provider>
    )
}

function App() {
    return (
        <div className="App d-flex flex-column">
            <SolanaWalletProvider>
                <WrappedApp/>
            </SolanaWalletProvider>
        </div>
    );
}

export default App;
