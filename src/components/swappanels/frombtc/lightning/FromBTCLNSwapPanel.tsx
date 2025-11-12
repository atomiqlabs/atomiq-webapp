import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import {FromBTCLNSwap, ISwap} from '@atomiqlabs/sdk';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { SwapPageUIState } from '../../../../hooks/pages/useSwapPage';
import {useFromBtcLnQuote} from "../../../../hooks/swaps/useFromBtcLnQuote";
import {SwapForGasAlert} from "../../../swaps/SwapForGasAlert";
import {StepByStep} from "../../../swaps/StepByStep";
import {ButtonWithWallet} from "../../../wallets/ButtonWithWallet";
import {ImportantNoticeModal} from "../../../swaps/ImportantNoticeModal";
import {SwapStepAlert} from "../../../swaps/SwapStepAlert";
import {BaseButton} from "../../../BaseButton";
import {ConnectedWalletPayButtons} from "../../../swaps/ConnectedWalletPayButtons";
import {DisconnectedWalletQrAndAddress} from "../../../swaps/DisconnectedWalletQrAndAddress";
import {SwapExpiryProgressBar} from "../../../swaps/SwapExpiryProgressBar";
import {ScrollAnchor} from "../../../ScrollAnchor";

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCLNSwapPanel(props: {
  quote: FromBTCLNSwap;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
}) {
  const page = useFromBtcLnQuote(props.quote, props.UICallback);

  const gasAlert = <SwapForGasAlert
    notEnoughForGas={page.additionalGasRequired}
    quote={props.quote}
  />;

  const stepByStep = page.executionSteps ? <StepByStep
    quote={props.quote}
    steps={page.executionSteps}
  /> : '';

  if(page.step1init) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}
        </div>

        {gasAlert}

        {!!page.step1init.init && <ButtonWithWallet
          requiredWalletAddress={props.quote._getInitiator()}
          chainId={props.quote?.chainIdentifier}
          className="swap-panel__action"
          onClick={page.step1init.init?.onClick}
          disabled={page.step1init.init?.disabled}
          size="lg"
        >
          Swap
        </ButtonWithWallet>}
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
            type={page.step2paymentWait.error?.type}
            icon={ic_warning}
            title={page.step2paymentWait.error?.title}
            error={page.step2paymentWait.error?.error}
            actionElement={page.step2paymentWait.error?.retry && (
              <BaseButton
                className="swap-step-alert__button"
                onClick={page.step2paymentWait.error?.retry}
                variant="secondary"
              >
                <i className="icon icon-retry"/>
                Retry
              </BaseButton>
            )}
          />

          {page.step2paymentWait.walletConnected && (
            <ConnectedWalletPayButtons
              wallet={page.step2paymentWait.walletConnected.lightningWallet}
              payWithBrowserWallet={page.step2paymentWait.walletConnected.payWithWebLn}
              useExternalWallet={page.step2paymentWait.walletConnected.useExternalWallet}
            />
          )}

          {page.step2paymentWait?.walletDisconnected && (
            <DisconnectedWalletQrAndAddress
              address={{
                ...page.step2paymentWait.walletDisconnected.address,
                description: 'Lightning network invoice'
              }}
              payWithDeeplink={{
                ...page.step2paymentWait.walletDisconnected.payWithLnWallet,
                text: 'Pay with LN wallet'
              }}
              payWithBrowserWallet={{
                ...page.step2paymentWait.walletDisconnected.payWithWebLn,
                text: (<>
                  <img className="mr-2" width={20} height={20} src="/wallets/WebLN-outline.svg" alt="WebLN"/>
                  Pay with WebLN
                </>)
              }}
              autoClaim={page.step2paymentWait.walletDisconnected.autoClaim}
              nfcScanning={page.step2paymentWait.walletDisconnected.nfcScanning}
            />
          )}

          {page.step2paymentWait?.walletDisconnected || page.step2paymentWait?.walletConnected ? (
            <div className="swap-panel__card__group">
              <SwapExpiryProgressBar
                timeRemaining={page.step2paymentWait.expiry.remaining}
                totalTime={page.step2paymentWait.expiry.total}
                show={true}
                expiryText="Swap address expired, please do not send any funds!"
                quoteAlias="Lightning invoice"
              />
            </div>
          ) : ''}
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

        {gasAlert}

        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      </>
    )
  }
}
