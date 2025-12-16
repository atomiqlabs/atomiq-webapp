import { useContext } from 'react';
import { QuickScan } from './pages/quickscan/QuickScan';
import { QuickScanExecute } from './pages/quickscan/QuickScanExecute';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SwapperContext } from './context/SwapperContext';
import { HistoryPage } from './pages/HistoryPage';
import { Spinner } from 'react-bootstrap';
import { MainNavigation } from './components/layout/MainNavigation';
import { FAQPage } from './pages/FAQPage';
import { AboutPage } from './pages/AboutPage';
import { SwapForGas } from './pages/SwapForGas';
import { SwapExplorer } from './pages/SwapExplorer';
import { SwapNew } from './pages/SwapNew';
import { ErrorAlert } from './components/_deprecated/ErrorAlert';
import { ChainsProvider } from './providers/ChainsProvider';
import { SocialFooter } from './components/layout/SocialFooter';
import { NotFound } from './pages/NotFound';
import {SwapperProvider} from "./providers/SwapperProvider";

function WrappedApp() {
  const { loading, loadingError } = useContext(SwapperContext);

  return (
    <>
      <MainNavigation />
      <div className="d-flex flex-grow-1 flex-column mt-4 mt-md-5">
        {loading ? (
          <div className="no-wallet-overlay d-flex align-items-center">
            <div className="mt-auto height-50 d-flex justify-content-center align-items-center flex-fill">
              <div className="text-white text-center">
                {loadingError == null ? (
                  <>
                    <Spinner />
                    <h4>Connecting to atomiq network...</h4>
                  </>
                ) : (
                  <>
                    <ErrorAlert
                      className="d-flex flex-column align-items-center justify-content-center"
                      title="atomiq network connection error"
                      error={loadingError}
                    />
                  </>
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
      <SocialFooter/>
    </>
  );
}

function App() {
  return (
    <div className="App d-flex flex-column">
      <ChainsProvider>
        <BrowserRouter>
          <SwapperProvider>
            <WrappedApp />
          </SwapperProvider>
        </BrowserRouter>
      </ChainsProvider>
    </div>
  );
}

export default App;
