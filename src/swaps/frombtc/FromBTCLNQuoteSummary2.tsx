import * as React from 'react';
import { Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { FromBTCLNSwap } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { LightningHyperlinkModal } from '../components/LightningHyperlinkModal';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';

import { StepByStep } from '../../components/StepByStep';
import { LightningQR } from '../components/LightningQR';
import { BaseButton } from '../../components/BaseButton';
import { SwapStepAlert } from '../components/SwapStepAlert';
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

        {page.step2paymentWait?.error && (
          <SwapStepAlert
            show={true}
            type="error"
            icon={ic_warning}
            title={page.step2paymentWait.error.title}
            description={
              page.step2paymentWait.error.error.message ||
              page.step2paymentWait.error.error.toString()
            }
            error={page.step2paymentWait.error.error}
          />
        )}

        {page.step2paymentWait?.walletConnected && !page.isPaymentCancelled && (
          <>
            <div className="swap-panel__card__group">
              <div className="payment-awaiting-buttons">
                <BaseButton
                  variant="secondary"
                  textSize="sm"
                  className="d-flex flex-row align-items-center"
                  onClick={page.step2paymentWait.walletConnected.payWithWebLn.onClick}
                  disabled={page.step2paymentWait.walletConnected.payWithWebLn.loading}
                >
                  {page.step2paymentWait.walletConnected.payWithWebLn.loading ? (
                    <Spinner animation="border" size="sm" className="mr-2" />
                  ) : (
                    <img width={20} height={20} src="/wallets/WebLN-outline.svg" alt="WebLN" />
                  )}
                  Pay via WebLN
                </BaseButton>
                <BaseButton
                  variant="secondary"
                  textSize="sm"
                  onClick={page.step2paymentWait.walletConnected.useExternalWallet.onClick}
                >
                  Use external wallet
                </BaseButton>
              </div>
            </div>

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

        {page.step2paymentWait?.walletDisconnected && (
          <>
            <div className="swap-panel__card__group">
              <LightningQR quote={props.quote} />

              <div className="payment-awaiting-buttons">
                <BaseButton
                  variant="secondary"
                  onClick={page.step2paymentWait.walletDisconnected.payWithLnWallet.onClick}
                >
                  <i className="icon icon-connect"></i>
                  <div className="sc-text">Pay with LN Wallet</div>
                </BaseButton>
                <BaseButton
                  variant="secondary"
                  textSize="sm"
                  className="d-flex flex-row align-items-center"
                  onClick={page.step2paymentWait.walletDisconnected.payWithWebLn.onClick}
                >
                  <img width={20} height={20} src="/wallets/WebLN-outline.svg" alt="WebLN" />
                  Pay via WebLN
                </BaseButton>
              </div>
            </div>

            {page.step2paymentWait.walletDisconnected.autoClaim ? (
              <div className="swap-panel__card__group">
                <Form className="auto-claim">
                  <div className="auto-claim__label">
                    <label title="" htmlFor="autoclaim" className="form-check-label">
                      Auto-claim
                    </label>
                    <OverlayTrigger
                      overlay={
                        <Tooltip id="autoclaim-pay-tooltip">
                          Automatically requests authorization of the claim transaction through your
                          wallet as soon as the lightning payment arrives.
                        </Tooltip>
                      }
                    >
                      <i className="icon icon-info"></i>
                    </OverlayTrigger>
                  </div>
                  <Form.Check // prettier-ignore
                    id="autoclaim"
                    type="switch"
                    onChange={(val) =>
                      page.step2paymentWait.walletDisconnected.autoClaim.onChange(
                        val.target.checked
                      )
                    }
                    checked={page.step2paymentWait.walletDisconnected.autoClaim.value}
                  />
                </Form>
              </div>
            ) : null}

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

        {page.step3claim && !page.isCommitCancelled && !page.isClaimCancelled && (
          <SwapStepAlert
            show={true}
            type="success"
            icon={ic_check_circle}
            title="Lightning network payment received"
            description="Claim your payment to finish the swap."
            actionElement={
              <ButtonWithWallet
                requiredWalletAddress={props.quote._getInitiator()}
                className="swap-step-alert__button"
                chainId={props.quote?.chainIdentifier}
                onClick={page.step3claim.commit.onClick}
                variant="secondary"
              >
                <i className="icon icon-claim"></i>
                Claim your payment
              </ButtonWithWallet>
            }
          />
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
            onClick={page.step1init.init?.onClick}
            disabled={page.step1init.init?.disabled}
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
          {page.isPaymentCancelled ? (
            <BaseButton
              onClick={props.refreshQuote}
              variant="secondary"
              className="swap-panel__action is-large"
            >
              Retry
            </BaseButton>
          ) : (
            <BaseButton
              onClick={props.abortSwap}
              variant="danger"
              className="swap-panel__action is-large"
            >
              Abort swap
            </BaseButton>
          )}
        </>
      );
    }

    // / Step 3: Claim
    // if (page.step3claim) {
    //     return (
    //         <>
    //             <ButtonWithWallet
    //                 requiredWalletAddress={props.quote._getInitiator()}
    //                 className="swap-panel__action"
    //                 chainId={props.quote?.chainIdentifier}
    //                 onClick={page.step3claim.commit.onClick}
    //                 disabled={page.step3claim.commit.disabled}
    //                 size={page.step3claim.commit.size}
    //             >
    //                 {page.step3claim.commit.loading && (
    //                     <Spinner animation="border" size="sm" className="mr-2" />
    //                 )}
    //                 {page.step3claim.commit.text}
    //             </ButtonWithWallet>
    //             {page.step3claim.claim && (
    //                 <ButtonWithWallet
    //                     requiredWalletAddress={props.quote._getInitiator()}
    //                     chainId={props.quote?.chainIdentifier}
    //                     onClick={page.step3claim.claim.onClick}
    //                     disabled={page.step3claim.claim.disabled}
    //                     size={page.step3claim.claim.size}
    //                     className="swap-panel__action"
    //                 >
    //                     {page.step3claim.claim.loading && (
    //                         <Spinner animation="border" size="sm" className="mr-2" />
    //                     )}
    //                     {page.step3claim.claim.text}
    //                 </ButtonWithWallet>
    //             )}
    //         </>
    //     );
    // }

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
