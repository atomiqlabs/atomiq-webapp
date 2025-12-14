import { useContext, useEffect, useRef, useState } from 'react';
import { QuickScan } from './pages/quickscan/QuickScan';
import { QuickScanExecute } from './pages/quickscan/QuickScanExecute';
import { Factory, FEConstants } from './FEConstants';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SwapperContext } from './context/SwapperContext';
import { Swapper } from '@atomiqlabs/sdk';
import { HistoryPage } from './pages/HistoryPage';
import { Spinner } from 'react-bootstrap';
import { MainNavigation } from './components/layout/MainNavigation';
import { FAQPage } from './pages/FAQPage';
import { AboutPage } from './pages/AboutPage';
import { SwapForGas } from './pages/SwapForGas';
import { SwapExplorer } from './pages/SwapExplorer';
import { Affiliate } from './pages/Affiliate';
import { SwapNew } from './pages/SwapNew';
import { ErrorAlert } from './components/_deprecated/ErrorAlert';
import { ChainsContext } from './context/ChainsContext';
import { ChainsProvider } from './providers/ChainsProvider';
import { SocialFooter } from './components/layout/SocialFooter';
import { NotFound } from './pages/NotFound';

const noWalletPaths = new Set(['/about', '/faq', '/explorer']);

function WrappedApp() {
  const [swapper, setSwapper] = useState<Swapper<any>>();
  const [swapperLoadingError, setSwapperLoadingError] = useState<any>();
  const [swapperLoading, setSwapperLoading] = useState<boolean>(false);

  const { pathname } = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('affiliate')) {
    window.localStorage.setItem('atomiq-affiliate', searchParams.get('affiliate'));
  }
  const affiliateLink =
    searchParams.get('affiliate') || window.localStorage.getItem('atomiq-affiliate');
  const useLp = searchParams.get('UNSAFE_LP_URL') ?? FEConstants.defaultLp;

  const abortController = useRef<AbortController>();

  const chainsData = useContext(ChainsContext);
  const loadSwapper: () => Promise<Swapper<any>> = async () => {
    setSwapperLoadingError(null);
    setSwapperLoading(true);
    if (abortController.current != null) abortController.current.abort();
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
          feeOverrideCode: 'frontend',
        },
        mempoolApi: FEConstants.mempoolApi,
        defaultTrustedIntermediaryUrl: FEConstants.trustedGasSwapLp,
      });

      console.log('Swapper: ', swapper);

      await swapper.init();
      if (abortController.current.signal.aborted) return;

      console.log('Swapper initialized!');

      setSwapper(swapper);
      setSwapperLoading(false);

      return swapper;
    } catch (e) {
      setSwapperLoadingError(e);
      console.error(e);
    }
  };

  useEffect(() => {
    if (!noWalletPaths.has(pathname) && swapper == null) loadSwapper();
  }, [pathname]);

  return (
    <>
      <SwapperContext.Provider value={{ swapper }}>
        <MainNavigation affiliateLink={affiliateLink} />
        <div className="d-flex flex-grow-1 flex-column mt-4 mt-md-5">
          {!noWalletPaths.has(pathname) && swapper == null ? (
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
                    ''
                  )}
                </div>
              </div>
            </div>
          ) : (
            ''
          )}
          <Routes>
            <Route path="/">
              <Route index element={<SwapNew />}></Route>
              <Route path="scan">
                <Route index element={<QuickScan />} />
                <Route path="2" element={<QuickScanExecute />} />
              </Route>
              <Route path="history" element={<HistoryPage />} />
              <Route path="gas" element={<SwapForGas />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="explorer" element={<SwapExplorer />} />
              <Route path="referral" element={<Affiliate />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>
      </SwapperContext.Provider>
      <SocialFooter affiliateLink={affiliateLink} />
    </>
  );
}

function App() {
  return (
    <div className="App d-flex flex-column">
      <ChainsProvider>
        <BrowserRouter>
          <WrappedApp />
        </BrowserRouter>
      </ChainsProvider>
    </div>
  );
}

export default App;
