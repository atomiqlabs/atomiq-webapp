import * as React from 'react';
import { Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import {FromBTCLNSwap, ISwap} from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../../components/ScrollAnchor';
import { SwapExpiryProgressBar } from '../../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../../components/SwapForGasAlert';

import { StepByStep } from '../../../components/StepByStep';
import { LightningQR } from '../../components/LightningQR';
import { BaseButton } from '../../../components/BaseButton';
import { SwapStepAlert } from '../../components/SwapStepAlert';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useFromBtcLnQuote } from './useFromBtcLnQuote';
import {SwapPageUIState} from "../../../pages/useSwapPage";
import {ImportantNoticeModal} from "../../components/ImportantNoticeModal";

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCLNQuoteSummary(props: {
  quote: FromBTCLNSwap;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
}) {
  const page = useFromBtcLnQuote(props.quote, props.UICallback);

  const stepByStep = page.executionSteps ? <StepByStep
    quote={props.quote}
    steps={page.executionSteps}
  /> : '';

  if(page.step1init) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step1init.error}
            type="error"
            icon={ic_warning}
            title={page.step1init.error?.title}
            description={page.step1init.error?.error.message}
            error={page.step1init.error?.error}
          />
        </div>

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

  if(page.step2paymentWait) {
    return (
      <>
        <ImportantNoticeModal
          opened={!!page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal}
          close={page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.close}
          setShowAgain={
            page.step2paymentWait.walletDisconnected?.addressComeBackWarningModal?.showAgain
              .onChange
          }
          text={(
            <>
              The payment will not succeed unless you{' '}
              <strong>return to the web app and claim the swap.</strong>
            </>
          )}
          buttonText="Understood, pay with LN wallet"
        />

        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2paymentWait.error}
            type="error"
            icon={ic_warning}
            title={page.step2paymentWait.error?.title}
            description={
              page.step2paymentWait.error?.error.message ||
              page.step2paymentWait.error?.error.toString()
            }
            error={page.step2paymentWait.error?.error}
          />

          {/*TODO: This should be a separate component to be re-used between FromBTCLN and FromBTC swaps*/}
          {page.step2paymentWait.walletConnected && (
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
                  expiryText="Swap address expired, please do not send any funds!"
                  quoteAlias="Lightning invoice"
                />
              </div>
            </>
          )}

          {/*TODO: This should be a separate component to be re-used between FromBTCLN and FromBTC swaps*/}
          {page.step2paymentWait?.walletDisconnected && (
            <>
              <div className="swap-panel__card__group">
                <LightningQR quote={props.quote}/>

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
                    <img width={20} height={20} src="/wallets/WebLN-outline.svg" alt="WebLN"/>
                    Pay via WebLN
                  </BaseButton>
                </div>
              </div>

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

              <div className="swap-panel__card__group">
                <SwapExpiryProgressBar
                  timeRemaining={page.step2paymentWait.expiry.remaining}
                  totalTime={page.step2paymentWait.expiry.total}
                  show={true}
                  expiryText="Swap address expired, please do not send any funds!"
                  quoteAlias="Lightning invoice"
                />
              </div>
            </>
          )}
        </div>

        <ScrollAnchor trigger={!!page.step2paymentWait.walletDisconnected} />

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

  if(page.step3claim) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step3claim.error}
            type="error"
            icon={ic_warning}
            title={page.step3claim.error?.title}
            description={page.step3claim.error?.error.message}
            error={page.step3claim.error?.error}
          />

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
                disabled={page.step3claim.commit.disabled}
                variant="secondary"
              >
                {page.step3claim.commit.loading
                  ? <Spinner animation="border" size="sm" className="mr-2" />
                  : <i className="icon icon-claim"></i>}
                Claim your payment
              </ButtonWithWallet>
            }
          />
        </div>
      </>
    )
  }

  if(page.step4) {
    return (
      <>
        <div className="swap-panel__card">
          {page.step4.state!=="expired_uninitialized" ? stepByStep : ''}

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

          <SwapStepAlert
            show={page.step4?.state === 'expired'}
            type="danger"
            icon={ic_warning}
            title="Swap expired"
            description={page.step4?.expiryMessage}
          />
        </div>

        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      </>
    )
  }
}
