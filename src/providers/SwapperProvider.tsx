import {Swapper, SwapperFactory} from "@atomiqlabs/sdk";
import {SolanaInitializer, SolanaInitializerType} from "@atomiqlabs/chain-solana";
import {StarknetInitializer, StarknetInitializerType} from "@atomiqlabs/chain-starknet";
import {
  BotanixInitializer,
  BotanixInitializerType,
  CitreaInitializer,
  CitreaInitializerType
} from "@atomiqlabs/chain-evm";
import {useEffect, useRef, useState} from "react";
import {useLocation} from "react-router-dom";
import {FEConstants} from "../FEConstants";
import {ChainsConfig} from "../data/ChainsConfig";
import {SwapperContext} from "../context/SwapperContext";

export const Factory = new SwapperFactory<
  readonly [SolanaInitializerType, StarknetInitializerType, CitreaInitializerType, BotanixInitializerType]
>([SolanaInitializer, StarknetInitializer, CitreaInitializer, BotanixInitializer] as const);

export const Tokens = Factory.Tokens;
export const TokenResolver = Factory.TokenResolver;

console.log('Factory: ', Factory);

const noSwapperPaths = new Set(['/about', '/faq', '/explorer']);

export function SwapperProvider(props: { children: React.ReactNode }) {
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

  const loadSwapper: () => Promise<Swapper<any>> = async () => {
    setSwapperLoadingError(null);
    setSwapperLoading(true);
    if (abortController.current != null) abortController.current.abort();
    abortController.current = new AbortController();
    try {
      const swapper = Factory.newSwapper({
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
        automaticClockDriftCorrection: true
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
    if (!noSwapperPaths.has(pathname) && swapper == null) loadSwapper();
  }, [pathname]);

  return (
    <SwapperContext.Provider value={{
      swapper,
      loading: swapperLoading,
      loadingError: swapperLoadingError,
      retry: loadSwapper
    }}>
      {props.children}
    </SwapperContext.Provider>
  )
}