import {Swapper, SwapperFactory, TypedSwapper} from "@atomiqlabs/sdk";
import {SolanaInitializer, SolanaInitializerType} from "@atomiqlabs/chain-solana";
import {StarknetInitializer, StarknetInitializerType} from "@atomiqlabs/chain-starknet";
import {
  AlpenInitializer,
  AlpenInitializerType,
  BotanixInitializer,
  BotanixInitializerType,
  CitreaInitializer,
  CitreaInitializerType, GoatInitializer, GoatInitializerType
} from "@atomiqlabs/chain-evm";
import {useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {FEConstants} from "../FEConstants";
import {ChainsConfig} from "../data/ChainsConfig";
import {SwapperContext} from "../context/SwapperContext";

export const Factory = new SwapperFactory<readonly [
  SolanaInitializerType,
  StarknetInitializerType,
  CitreaInitializerType,
  BotanixInitializerType,
  AlpenInitializerType,
  GoatInitializerType,
]>([
  SolanaInitializer,
  StarknetInitializer,
  CitreaInitializer,
  BotanixInitializer,
  AlpenInitializer,
  GoatInitializer,
] as const);

export const Tokens = Factory.Tokens;
export const TokenResolver = Factory.TokenResolver;

console.log('Factory: ', Factory);

const noSwapperPaths = new Set(['/about', '/faq', '/explorer']);

export function SwapperProvider(props: { children: React.ReactNode }) {
  const [swapper, setSwapper] = useState<Swapper<any>>();
  const [swapperLoadingError, setSwapperLoadingError] = useState<any>();
  const [swapperLoading, setSwapperLoading] = useState<boolean>(false);

  const [swapperSyncingError, setSwapperSyncingError] = useState<any>();
  const [swapperSyncing, setSwapperSyncing] = useState<boolean>(false);

  const { pathname } = useLocation();

  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('affiliate')) {
    window.localStorage.setItem('atomiq-affiliate', searchParams.get('affiliate'));
  }
  const affiliateLink =
    searchParams.get('affiliate') || window.localStorage.getItem('atomiq-affiliate');
  const useLp = searchParams.get('UNSAFE_LP_URL') ?? FEConstants.defaultLp;

  const abortController = useRef<AbortController>();

  const loadSwapper: () => Promise<void> = async () => {
    setSwapperLoadingError(null);
    setSwapperLoading(true);
    if (abortController.current != null) abortController.current.abort();
    abortController.current = new AbortController();
    let _swapper: Swapper<any>;
    try {
      _swapper = Factory.newSwapper({
        chains: ChainsConfig,
        intermediaryUrl: useLp,
        getRequestTimeout: 15000,
        postRequestTimeout: 30000,
        bitcoinNetwork: ChainsConfig.BITCOIN.network,
        pricingFeeDifferencePPM: 50000n,
        defaultAdditionalParameters: {
          affiliate: affiliateLink,
          feeOverrideCode: 'frontend',
        },
        mempoolApi: ChainsConfig.BITCOIN.mempoolApi,
        defaultTrustedIntermediaryUrl: FEConstants.trustedGasSwapLp,
        automaticClockDriftCorrection: true,
        dontCheckPastSwaps: true //Check manually after loading the swapper
      });

      console.log('Swapper: ', _swapper);

      await _swapper.init();
      if (abortController.current.signal.aborted) return;

      console.log('Swapper initialized!');

      setSwapper(_swapper);
      setSwapperLoading(false);
    } catch (e) {
      setSwapperLoadingError(e);
      console.error(e);
      return;
    }

    setSwapperSyncing(true);
    setSwapperSyncingError(null);
    try {
      await _swapper._syncSwaps();
    } catch (e) {
      setSwapperSyncingError(e);
      console.error(e);
    }
    if (abortController.current.signal.aborted) return;
    setSwapperSyncing(false);
  };

  useEffect(() => {
    if (!noSwapperPaths.has(pathname) && swapper == null) loadSwapper();
  }, [pathname]);

  return (
    <SwapperContext.Provider value={{
      swapper,
      loading: swapperLoading,
      loadingError: swapperLoadingError,
      syncing: swapperSyncing,
      syncingError: swapperSyncingError,
      retry: loadSwapper
    }}>
      {props.children}
    </SwapperContext.Provider>
  )
}