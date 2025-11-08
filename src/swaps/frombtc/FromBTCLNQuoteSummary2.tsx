import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { FromBTCLNSwap, FromBTCLNSwapState } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { LightningHyperlinkModal } from '../components/LightningHyperlinkModal';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';

import { StepByStep, WalletData } from '../../components/StepByStep';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { LightningQR } from '../components/LightningQR';
import { useFromBtcLnQuote } from './useFromBtcLnQuote';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useFromBtcLnQuote2 } from './useFromBtcLnQuote2';

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCLNQuoteSummary2(props: {
  quote: FromBTCLNSwap;
  refreshQuote: () => void;
  setAmountLock: (isLocked: boolean) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
}) {
  const page = useFromBtcLnQuote2(props.quote, props.setAmountLock);

  // Render card content (progress, alerts, etc.)
  const renderCard = () => {
    const isInitiated = !page.step1init;
    if (!isInitiated) return null;

    return (
      <div className="swap-panel__card">
        {page.executionSteps && <StepByStep quote={props.quote} steps={page.executionSteps} />}

        {/* Errors and status alerts */}
        <SwapStepAlert
          show={!!page.step1init?.error}
          type="error"
          icon={ic_warning}
          title={page.step1init?.error?.title}
          description={page.step1init?.error?.error.message}
          error={page.step1init?.error?.error}
        />

        {page.step2paymentWait?.walletDisconnected && (
          <>
            <LightningQR
              quote={props.quote}
              setAutoClaim={page.step2paymentWait.walletDisconnected.autoClaim.onChange}
              autoClaim={page.step2paymentWait.walletDisconnected.autoClaim.value}
              onHyperlink={page.step2paymentWait.walletDisconnected.payWithLnWallet.onClick}
            />
            <div className="swap-panel__card__group">
              <SwapExpiryProgressBar
                timeRemaining={page.step2paymentWait.expiry.remaining}
                totalTime={page.step2paymentWait.expiry.total}
                show={true}
                type="bar"
                expiryText="Swap address expired, please do not send any funds!"
                quoteAlias="Lightning invoice"
              />
            </div>
          </>
        )}

        <SwapStepAlert
          show={!!page.step3claim?.error}
          type="error"
          icon={ic_warning}
          title={page.step3claim?.error?.title}
          description={page.step3claim?.error?.error.message}
          error={page.step3claim?.error?.error}
        />

        <SwapStepAlert
          show={page.step4?.state === 'success'}
          type="success"
          icon={ic_check_circle}
          title="Swap success"
          description="Your swap was executed successfully!"
        />

        <SwapStepAlert
          show={page.step4?.state === 'failed'}
          type="danger"
          icon={ic_warning}
          title="Swap failed"
          description="Swap HTLC expired, your lightning payment will be refunded shortly!"
        />
      </div>
    );
  };

  // Render action buttons based on current step
  const renderActions = () => {
    // Step 1: Init
    if (page.step1init) {
      if (page.step1init.invalidSmartChainWallet) {
        return (
          <ButtonWithWallet
            chainId={props.quote.chainIdentifier}
            requiredWalletAddress={props.quote._getInitiator()}
            size="lg"
            className="swap-panel__action"
          />
        );
      }

      return (
        <>
          <SwapForGasAlert
            notEnoughForGas={page.step1init.additionalGasRequired?.rawAmount}
            quote={props.quote}
          />
          <ButtonWithWallet
            requiredWalletAddress={props.quote._getInitiator()}
            chainId={props.quote?.chainIdentifier}
            className="swap-panel__action"
            onClick={page.step1init.init}
            disabled={!!props.notEnoughForGas}
            size="lg"
          >
            Swap
          </ButtonWithWallet>
        </>
      );
    }

    // Step 2: Payment Wait
    if (page.step2paymentWait) {
      return (
        <>
          <LightningHyperlinkModal
            opened={!!page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal}
            close={page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.close}
            setShowHyperlinkWarning={
              page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.showAgain
                .onChange
            }
          />
          <BaseButton
            onClick={props.abortSwap}
            variant="danger"
            className="swap-panel__action is-large"
          >
            Abort swap
          </BaseButton>
        </>
      );
    }

    // Step 3: Claim
    if (page.step3claim) {
      return (
        <>
          <ButtonWithWallet
            requiredWalletAddress={props.quote._getInitiator()}
            className="swap-panel__action"
            chainId={props.quote?.chainIdentifier}
            onClick={page.step3claim.commit.onClick}
            disabled={page.step3claim.commit.disabled}
            size={page.step3claim.commit.size}
          >
            {page.step3claim.commit.loading && (
              <Spinner animation="border" size="sm" className="mr-2" />
            )}
            {page.step3claim.commit.text}
          </ButtonWithWallet>
          {page.step3claim.claim && (
            <ButtonWithWallet
              requiredWalletAddress={props.quote._getInitiator()}
              chainId={props.quote?.chainIdentifier}
              onClick={page.step3claim.claim.onClick}
              disabled={page.step3claim.claim.disabled}
              size={page.step3claim.claim.size}
              className="swap-panel__action"
            >
              {page.step3claim.claim.loading && (
                <Spinner animation="border" size="sm" className="mr-2" />
              )}
              {page.step3claim.claim.text}
            </ButtonWithWallet>
          )}
        </>
      );
    }

    // Step 4: Completion
    if (page.step4) {
      return (
        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      );
    }

    return null;
  };

  return (
    <>
      {renderCard()}
      {renderActions()}
      <ScrollAnchor trigger={page.step1init == null} />
    </>
  );
}
