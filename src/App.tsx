import "./App.css";
import { useContext, useEffect, useRef, useState } from "react";
import { QuickScan } from "./pages/quickscan/QuickScan";
import { QuickScanExecute } from "./pages/quickscan/QuickScanExecute";
import { Factory, FEConstants } from "./FEConstants";
import { smartChainTokenArray } from "./tokens/Tokens";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SwapsContext } from "./swaps/context/SwapsContext";
import { BitcoinNetwork, Swapper } from "@atomiqlabs/sdk";
import { History } from "./pages/History";
import {
  Badge,
  Col,
  Container,
  Nav,
  Navbar,
  OverlayTrigger,
  Row,
  Spinner,
  Tooltip,
} from "react-bootstrap";
import { MainNavigation } from "./components/layout/MainNavigation";
import { FAQ } from "./pages/FAQ";
import { About } from "./pages/About";
import { info } from "react-icons-kit/fa/info";
import { question } from "react-icons-kit/fa/question";
import { exchange } from "react-icons-kit/fa/exchange";
import Icon from "react-icons-kit";
import { SwapForGas } from "./pages/SwapForGas";
import { SwapExplorer } from "./pages/SwapExplorer";
import { Affiliate } from "./pages/Affiliate";
import { heart } from "react-icons-kit/fa/heart";
import { SwapNew } from "./pages/SwapNew";
import { useAnchorNavigate } from "./utils/hooks/useAnchorNavigate";
import { ErrorAlert } from "./components/ErrorAlert";
import { WalletConnectionsSummary } from "./wallets/WalletConnectionsSummary";
import { NFCSwitch } from "./nfc/NFCSwitch";
import { ChainDataContext } from "./wallets/context/ChainDataContext";
import { ChainDataProvider } from "./wallets/ChainDataProvider";
import { SocialFooter } from "./components/layout/SocialFooter";

require("@solana/wallet-adapter-react-ui/styles.css");

const noWalletPaths = new Set(["/about", "/faq", "/46jh456f45f"]);

function WrappedApp() {
  const navigateHref = useAnchorNavigate();

  const [swapper, setSwapper] = useState<Swapper<any>>();
  const [swapperLoadingError, setSwapperLoadingError] = useState<any>();
  const [swapperLoading, setSwapperLoading] = useState<boolean>(false);

  // @ts-ignore
  const pathName = window.location.pathname.split("?")[0];

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("affiliate")) {
    window.localStorage.setItem(
      "atomiq-affiliate",
      searchParams.get("affiliate"),
    );
  }
  const affiliateLink =
    searchParams.get("affiliate") ||
    window.localStorage.getItem("atomiq-affiliate");
  const useLp = searchParams.get("UNSAFE_LP_URL") ?? FEConstants.defaultLp;

  const abortController = useRef<AbortController>();

  const chainsData = useContext(ChainDataContext);
  const loadSwapper: () => Promise<Swapper<any>> = async () => {
    setSwapperLoadingError(null);
    setSwapperLoading(true);
    if (abortController.current != null) abortController.current.abort();
    abortController.current = new AbortController();
    try {
      console.log("init start");

      const swapper = Factory.newSwapper({
        chains: {
          SOLANA: chainsData.SOLANA?.swapperOptions,
          STARKNET: chainsData.STARKNET?.swapperOptions,
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

      console.log("Swapper: ", swapper);

      await swapper.init();
      if (abortController.current.signal.aborted) return;

      console.log("Swapper initialized!");

      setSwapper(swapper);
      setSwapperLoading(false);

      return swapper;
    } catch (e) {
      setSwapperLoadingError(e);
      console.error(e);
    }
  };

  useEffect(() => {
    if (!noWalletPaths.has(pathName) && swapper == null) loadSwapper();
  }, [pathName]);

  return (
    <>
      <MainNavigation />

      <SwapsContext.Provider value={{ swapper }}>
        <div className="d-flex flex-grow-1 flex-column">
          {!noWalletPaths.has(pathName) && swapper == null ? (
            <div className="no-wallet-overlay d-flex align-items-center">
              <div className="mt-auto height-50 d-flex justify-content-center align-items-center flex-fill">
                <div className="text-white text-center">
                  {swapperLoading ? (
                    <>
                      {swapperLoadingError == null ? (
                        <>
                          <Spinner />
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
                  ) : (
                    ""
                  )}
                </div>
              </div>
            </div>
          ) : (
            ""
          )}
          <Routes>
            <Route path="/">
              <Route
                index
                element={<SwapNew supportedCurrencies={smartChainTokenArray} />}
              ></Route>
              <Route path="scan">
                <Route index element={<QuickScan />} />
                <Route path="2" element={<QuickScanExecute />} />
              </Route>
              <Route path="history" element={<History />} />
              <Route path="gas" element={<SwapForGas />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="about" element={<About />} />
              <Route path="46jh456f45f" element={<SwapExplorer />} />
              <Route path="referral" element={<Affiliate />} />
            </Route>
          </Routes>
        </div>
      </SwapsContext.Provider>
      <SocialFooter affiliateLink={affiliateLink} />
    </>
  );
}

function App() {
  return (
    <div className="App d-flex flex-column">
      <ChainDataProvider>
        <BrowserRouter>
          <WrappedApp />
        </BrowserRouter>
      </ChainDataProvider>
    </div>
  );
}

export default App;
