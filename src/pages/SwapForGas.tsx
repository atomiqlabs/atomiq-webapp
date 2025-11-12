import { Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapTopbar } from './SwapTopbar';
import * as React from 'react';
import { useCallback, useContext, useEffect } from 'react';
import { AbstractSigner } from '@atomiqlabs/sdk';
import { SwapperContext } from '../context/SwapperContext';
import { useAnchorNavigate } from '../hooks/navigation/useAnchorNavigate';
import { useAsync } from '../hooks/utils/useAsync';
import { ErrorAlert } from '../components/_deprecated/ErrorAlert';
import { useChain } from '../hooks/chains/useChain';
import { Chain } from '../providers/ChainsProvider';
import { TrustedFromBTCLNSwapPanel } from '../components/swappanels/frombtc/trusted/TrustedFromBTCLNSwapPanel';
import {SwapStepAlert} from "../components/swaps/SwapStepAlert";
import {BaseButton} from "../components/BaseButton";
import {ic_warning} from "react-icons-kit/md/ic_warning";

const defaultSwapAmount = '12500000';

export function SwapForGas() {
  const { swapper } = useContext(SwapperContext);

  const navigate = useNavigate();
  const navigateHref = useAnchorNavigate();

  const { state } = useLocation() as {
    state: { returnPath?: string; chainId?: string; amount: string };
  };
  const chainId = state?.chainId ?? 'SOLANA';
  const nativeCurrency = swapper == null ? null : swapper.Utils.getNativeToken(chainId);
  const amount = BigInt(state?.amount ?? defaultSwapAmount);

  const outputChainData: Chain<AbstractSigner> = useChain(nativeCurrency);

  const [createSwap, loading, swapData, error] = useAsync(() => {
    if (swapper == null || outputChainData?.wallet == null) return null;
    return swapper.createTrustedLNForGasSwap(
      chainId,
      outputChainData.wallet.instance.getAddress(),
      amount
    );
  }, [swapper, outputChainData?.wallet, chainId]);

  useEffect(() => {
    createSwap();
  }, [createSwap]);

  const onContinue = useCallback(() => {
    navigate(state.returnPath ?? "/");
  }, [swapData]);

  return (
    <>
      <div className="d-flex flex-column align-items-center text-white">
        <div className="swap-panel">
          <div className="alert-message is-info mb-3">
            <i className="alert-message__icon icon icon-info"></i>
            <div className="alert-message__body">
              Swap for gas is a trusted service allowing you to swap BTCLN to{' '}
              {nativeCurrency?.ticker}, so you can then cover the gas fees of a trustless atomiq
              swap. Note that this is a trusted service and is therefore only used for small
              amounts! You can read more about it in our{' '}
              <a href="/faq?tabOpen=11" onClick={navigateHref}>
                FAQ
              </a>
              .
            </div>
          </div>

          <div className="swap-panel__card">
            <SwapStepAlert
              className="mt-0"
              show={!!error}
              type="error"
              icon={ic_warning}
              title="Swap cannot be created"
              error={error}
              actionElement={(
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={createSwap}
                  variant="secondary"
                >
                  <i className="icon icon-retry"/>
                  Retry
                </BaseButton>
              )}
            />

            {loading ? (
              <div className="d-flex flex-column align-items-center p-2 gap-3">
                <Spinner/>
                <label>Creating gas swap...</label>
              </div>
            ) : (
              ''
            )}
          </div>

          {swapData != null ? (
            <TrustedFromBTCLNSwapPanel
              quote={swapData}
              refreshQuote={createSwap}
              abortSwap={onContinue}
              continue={onContinue}
            />
          ) : (
            ''
          )}
        </div>
      </div>
    </>
  );
}
