import { Alert, Button, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapTopbar } from './SwapTopbar';
import * as React from 'react';
import { useCallback, useContext, useEffect } from 'react';
import Icon from 'react-icons-kit';
import { AbstractSigner, LnForGasSwapState } from '@atomiqlabs/sdk';
import ValidatedInput from '../components/ValidatedInput';
import { ic_south } from 'react-icons-kit/md/ic_south';
import { SwapsContext } from '../swaps/context/SwapsContext';
import { TokenIcon } from '../tokens/TokenIcon';
import { useAnchorNavigate } from '../utils/hooks/useAnchorNavigate';
import { useAsync } from '../utils/hooks/useAsync';
import { TrustedFromBTCLNQuoteSummary } from '../swaps/frombtc/trusted/TrustedFromBTCLNQuoteSummary';
import { useSwapState } from '../swaps/hooks/useSwapState';
import { ErrorAlert } from '../components/ErrorAlert';
import { Tokens } from '../FEConstants';
import { useChain } from '../wallets/hooks/useChain';
import { ChainWalletData } from '../wallets/ChainDataProvider';

const defaultSwapAmount = '12500000';

export function SwapForGas() {
  const { swapper } = useContext(SwapsContext);

  const navigate = useNavigate();
  const navigateHref = useAnchorNavigate();

  const { state } = useLocation() as {
    state: { returnPath?: string; chainId?: string; amount: string };
  };
  const chainId = state?.chainId ?? 'SOLANA';
  const nativeCurrency = swapper == null ? null : swapper.Utils.getNativeToken(chainId);
  const amount = BigInt(state?.amount ?? defaultSwapAmount);

  const outputChainData: ChainWalletData<AbstractSigner> = useChain(nativeCurrency);

  const [createSwap, loading, swapData, error] = useAsync(() => {
    if (swapper == null || outputChainData?.wallet == null) return null;
    return swapper.createTrustedLNForGasSwap(
      chainId,
      outputChainData.wallet.instance.getAddress(),
      amount
    );
  }, [swapper, outputChainData?.wallet, chainId]);
  const { state: swapState } = useSwapState(swapData);

  useEffect(() => {
    createSwap();
  }, [createSwap]);

  const onContinue = useCallback(() => {
    navigate(state.returnPath);
  }, [swapData]);

  return (
    <>
      <SwapTopbar selected={3} enabled={true} />

      <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
        <div className="quickscan-summary-panel d-flex flex-column flex-fill">
          <div className="p-3 d-flex flex-column tab-bg border-0 card mb-3">
            <ErrorAlert className="mb-3" title="Loading error" error={error} />

            <Alert
              className="text-center mb-3 d-flex align-items-center flex-column"
              show={!error}
              variant="success"
              closeVariant="white"
            >
              <label>
                Swap for gas is a trusted service allowing you to swap BTCLN to{' '}
                {nativeCurrency?.ticker}, so you can then cover the gas fees of a trustless atomiq
                swap. Note that this is a trusted service and is therefore only used for small
                amounts! You can read more about it in our{' '}
                <a href="/faq?tabOpen=11" onClick={navigateHref}>
                  FAQ
                </a>
                .
              </label>
            </Alert>

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center tab-accent">
                <Spinner animation="border" />
                Creating gas swap...
              </div>
            ) : (
              ''
            )}

            {swapData != null ? (
              <div className="mb-3 tab-accent-p3 text-center">
                <ValidatedInput
                  type={'number'}
                  textEnd={
                    <span className="text-white font-bigger d-flex align-items-center">
                      <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTCLN} className="currency-icon" />
                      BTCLN
                    </span>
                  }
                  disabled={true}
                  size={'lg'}
                  value={swapData.getInput().amount}
                  onChange={() => {}}
                  placeholder={'Input amount'}
                />

                <Icon size={24} icon={ic_south} className="my-1" />

                <ValidatedInput
                  type={'number'}
                  textEnd={
                    <span className="text-white font-bigger d-flex align-items-center">
                      <TokenIcon tokenOrTicker={nativeCurrency} className="currency-icon" />
                      {nativeCurrency.ticker}
                    </span>
                  }
                  disabled={true}
                  size={'lg'}
                  value={swapData.getOutput().amount}
                  onChange={() => {}}
                  placeholder={'Output amount'}
                />
              </div>
            ) : (
              ''
            )}

            {swapData != null ? (
              <TrustedFromBTCLNQuoteSummary
                quote={swapData}
                refreshQuote={createSwap}
                abortSwap={() => {
                  if (state?.returnPath != null) navigate(state.returnPath);
                }}
              />
            ) : (
              ''
            )}

            {swapState === LnForGasSwapState.FINISHED && state?.returnPath != null ? (
              <Button onClick={onContinue} variant="primary" className="mt-3">
                Continue
              </Button>
            ) : (
              ''
            )}
          </div>
        </div>
      </div>
    </>
  );
}
