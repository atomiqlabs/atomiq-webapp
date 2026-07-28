import { useEffect, useMemo } from 'react';
import {SolanaWalletWrapper, useSolanaChain} from './chains/useSolanaChain';
import {useStarknetChain} from './chains/useStarknetChain';
import {useLightningNetwork} from './chains/useLightningNetwork';
import {useBitcoinChain} from './chains/useBitcoinChain';
import {EVMWalletWrapper, useAlpenChain, useBotanixChain, useCitreaChain, useGoatChain} from './chains/useEVMChains';
import {ChainsConfig} from '../data/ChainsConfig';
import type {Chain} from './ChainsProvider';

/**
 * Null-rendering hook runner: runs all chain hooks (exactly as the old
 * WrappedChainsProvider did) and lifts the resulting chains map up to the
 * ChainsProvider shell via the onChains callback.
 */
function ChainHooksRunner(props: { onChains: (chains: Record<string, Chain<any>>) => void }) {
  const { onChains } = props;

  const solanaResult = useSolanaChain(!!ChainsConfig.SOLANA);
  const starknetResult = useStarknetChain(!!ChainsConfig.STARKNET);
  const citreaResult = useCitreaChain(!!ChainsConfig.CITREA);
  const botanixResult = useBotanixChain(!!ChainsConfig.BOTANIX);
  const alpenResult = useAlpenChain(!!ChainsConfig.ALPEN);
  const goatResult = useGoatChain(!!ChainsConfig.GOAT);
  const lightningResult = useLightningNetwork(!!ChainsConfig.LIGHTNING);
  const bitcoinResult = useBitcoinChain(!!ChainsConfig.BITCOIN, {
    STARKNET: starknetResult?.wallet?.name,
    SOLANA: solanaResult?.wallet?.name,
    CITREA: citreaResult?.wallet?.name,
    BOTANIX: botanixResult?.wallet?.name,
    ALPEN: alpenResult?.wallet?.name,
    GOAT: goatResult?.wallet?.name
  });

  const chains = useMemo(() => {
    const chainsData: Record<string, Chain<any>> = {};

    // Add wallets and chain data based on configuration
    if (solanaResult) chainsData.SOLANA = solanaResult;
    if (starknetResult) chainsData.STARKNET = starknetResult;
    if (citreaResult) chainsData.CITREA = citreaResult;
    if (botanixResult) chainsData.BOTANIX = botanixResult;
    if (alpenResult) chainsData.ALPEN = alpenResult;
    if (lightningResult) chainsData.LIGHTNING = lightningResult;
    if (bitcoinResult) chainsData.BITCOIN = bitcoinResult;
    if (goatResult) chainsData.GOAT = goatResult;

    return chainsData;
  }, [
    solanaResult,
    starknetResult,
    citreaResult,
    botanixResult,
    alpenResult,
    goatResult,
    lightningResult,
    bitcoinResult
  ]);

  useEffect(() => {
    onChains(chains);
  }, [chains, onChains]);

  return null;
}

export default function ConnectorBridge(props: {
  onChains: (chains: Record<string, Chain<any>>) => void;
}) {
  return (
    <SolanaWalletWrapper>
      <EVMWalletWrapper>
        <ChainHooksRunner onChains={props.onChains} />
      </EVMWalletWrapper>
    </SolanaWalletWrapper>
  );
}
