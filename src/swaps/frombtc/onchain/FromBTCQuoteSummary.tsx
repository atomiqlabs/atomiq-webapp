import * as React from 'react';
import { useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { AlertMessage } from '../../../components/AlertMessage';
import { QRCodeSVG } from 'qrcode.react';
import { FromBTCSwap, ISwap } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../../components/ScrollAnchor';
import { CopyOverlay } from '../../../components/CopyOverlay';
import { SwapExpiryProgressBar } from '../../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../../components/SwapForGasAlert';

import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../../components/StepByStep';
import { BaseButton } from '../../../components/BaseButton';
import { SwapStepAlert } from '../../components/SwapStepAlert';
import { WalletAddressPreview } from '../../../components/WalletAddressPreview';
import { SwapConfirmations } from '../../components/SwapConfirmations';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { useFromBtcQuote } from './useFromBtcQuote';
import { SwapPageUIState } from '../../../pages/useSwapPage';
import {ImportantNoticeModal} from "../../components/ImportantNoticeModal";

/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCQuoteSummary(props: {
  quote: FromBTCSwap<any>;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
  feeRate?: number;
  balance?: bigint;
}) {
  const page = useFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);

  const stepByStep = page.executionSteps ? (
    <StepByStep quote={props.quote} steps={page.executionSteps} />
  ) : (
    ''
  );

  //TODO: This should be contained in a standalone component
  const addressContent = useCallback(
    (show) => (
      <>
        <AlertMessage variant="warning" className="mb-3">
          Send <strong>EXACTLY {props.quote.getInput().toString()}</strong> to the address below.
        </AlertMessage>

        <QRCodeSVG
          value={page.step2paymentWait?.walletDisconnected?.address.hyperlink}
          size={240}
          includeMargin={true}
          className="cursor-pointer"
          onClick={(event) => {
            show(event.target, page.step2paymentWait?.walletDisconnected?.address.value);
            page.step2paymentWait.walletDisconnected.address.copy();
          }}
        />
        <WalletAddressPreview
          address={page.step2paymentWait?.walletDisconnected?.address.value}
          chainName={'Bitcoin'}
          onCopy={page.step2paymentWait?.walletDisconnected?.address.copy}
        />
        <div className="payment-awaiting-buttons">
          <BaseButton
            variant="secondary"
            onClick={page.step2paymentWait?.walletDisconnected?.payWithBitcoinWallet.onClick}
          >
            <i className="icon icon-connect"></i>
            <div className="sc-text">Pay with BTC Wallet</div>
          </BaseButton>
          <BaseButton
            variant="secondary"
            onClick={page.step2paymentWait?.walletDisconnected?.payWithBrowserWallet.onClick}
            disabled={page.step2paymentWait?.walletDisconnected?.payWithBrowserWallet.loading}
          >
            <i className="icon icon-new-window"></i>
            <div className="sc-text">Pay via Browser Wallet</div>
          </BaseButton>
        </div>
      </>
    ),
    [page.step2paymentWait?.walletDisconnected]
  );

  if (page.step1init) {
    return (
      <>
        <div className="swap-panel__card">
          <SwapStepAlert
            show={!!page.step1init.error}
            type="error"
            icon={ic_warning}
            title={page.step1init.error?.title}
            description={page.step1init.error?.error.message}
            error={page.step1init.error?.error}
          />

          <SwapForGasAlert
            notEnoughForGas={page.step1init?.additionalGasRequired?.rawAmount}
            quote={props.quote}
          />
        </div>

        <ButtonWithWallet
          requiredWalletAddress={props.quote._getInitiator()}
          chainId={props.quote.chainIdentifier}
          onClick={page.step1init.init.onClick}
          disabled={page.step1init.init.disabled}
          size="lg"
          className="swap-panel__action"
        >
          {page.step1init.init.loading ? (
            <Spinner animation="border" size="sm" className="mr-2" />
          ) : (
            ''
          )}
          Swap
        </ButtonWithWallet>
      </>
    );
  }

  if (page.step2paymentWait) {
    return (
      <>
        <ImportantNoticeModal
          opened={!!page.step2paymentWait.walletDisconnected?.addressCopyWarningModal}
          close={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.close}
          setShowAgain={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange}
          text={(
            <>
              Make sure you send{' '}
              <b>EXACTLY {page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.btcAmount.toString()}</b>
              , as sending a different amount will not be accepted, and you might lose your funds!
            </>
          )}
          buttonText="Understood, copy address"
        />

        <div className="swap-panel__card">
          {stepByStep}

          <div className="swap-panel__card__group">
            {page.step2paymentWait.walletConnected ? (
              <div className="payment-awaiting-buttons">
                <BaseButton
                  variant="secondary"
                  textSize="sm"
                  className="d-flex flex-row align-items-center"
                  disabled={page.step2paymentWait.walletConnected.payWithBrowserWallet.loading}
                  onClick={page.step2paymentWait.walletConnected.payWithBrowserWallet.onClick}
                >
                  {page.step2paymentWait.walletConnected.payWithBrowserWallet.loading ? (
                    <Spinner animation="border" size="sm" className="mr-2" />
                  ) : (
                    ''
                  )}
                  Pay with{' '}
                  <img
                    width={20}
                    height={20}
                    src={page.step2paymentWait.walletConnected.bitcoinWallet.icon}
                  />{' '}
                  {page.step2paymentWait.walletConnected.bitcoinWallet.name}
                </BaseButton>

                <BaseButton
                  variant="secondary"
                  textSize="sm"
                  className="d-flex flex-row align-items-center"
                  onClick={page.step2paymentWait.walletConnected.useExternalWallet.onClick}
                >
                  Use a QR/wallet address
                </BaseButton>
              </div>
            ) : (
              ''
            )}
            {page.step2paymentWait.walletDisconnected ? (
              <CopyOverlay placement={'top'}>{addressContent}</CopyOverlay>
            ) : (
              ''
            )}
          </div>

          <div className="swap-panel__card__group">
            <SwapExpiryProgressBar
              timeRemaining={page.step2paymentWait.expiry.remaining}
              totalTime={page.step2paymentWait.expiry.total}
              expiryText="Swap address expired, please do not send any funds!"
              quoteAlias="Swap address"
            />
          </div>

          <SwapStepAlert
            show={!!page.step2paymentWait.error}
            type="error"
            icon={ic_warning}
            title={page.step2paymentWait.error?.title}
            description={page.step2paymentWait.error?.error.message}
            error={page.step2paymentWait.error?.error}
            action={
              page.step2paymentWait.error?.retry
                ? {
                    type: 'button',
                    text: 'Retry',
                    onClick: page.step2paymentWait.error?.retry,
                    variant: 'secondary',
                  }
                : undefined
            }
          />

          <ScrollAnchor trigger={true} />
        </div>

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

  if (page.step3awaitingConfirmations) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          {page.step3awaitingConfirmations.broadcasting ? (
            <div className="swap-panel__card__group">
              <div className="d-flex flex-column align-items-center p-2 gap-3">
                <Spinner />
                <label>Sending Bitcoin transaction...</label>
              </div>
            </div>
          ) : (
            <SwapConfirmations txData={page.step3awaitingConfirmations.txData} />
          )}
        </div>

        <SwapStepAlert
          show={!!page.step3awaitingConfirmations.error}
          type="error"
          icon={ic_warning}
          title={page.step3awaitingConfirmations.error?.title}
          description={page.step3awaitingConfirmations.error?.error.message}
          error={page.step3awaitingConfirmations.error?.error}
          action={{
            type: 'button',
            text: 'Retry',
            onClick: page.step3awaitingConfirmations.error?.retry,
            variant: 'secondary',
          }}
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

  if (page.step4claim) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          {page.step4claim.waitingForWatchtowerClaim ? (
            <div className="swap-confirmations">
              <div className="swap-confirmations__estimate">
                <Spinner />
              </div>
              <div className="swap-confirmations__name">
                Transaction received & confirmed, waiting for claim by watchtowers...
              </div>
            </div>
          ) : (
            <>
              <SwapStepAlert
                show={!!page.step4claim.error}
                type="error"
                icon={ic_warning}
                title={page.step4claim.error?.title}
                description={page.step4claim.error?.error.message}
                error={page.step4claim.error?.error}
              />

              <SwapStepAlert
                show={true}
                type="success"
                icon={ic_check_circle}
                title="Bitcoin transaction confirmed"
                description="Claim your payment to finish the swap."
                actionElement={
                  <ButtonWithWallet
                    requiredWalletAddress={props.quote._getInitiator()}
                    className="swap-step-alert__button"
                    chainId={props.quote?.chainIdentifier}
                    onClick={page.step4claim.claim.onClick}
                    disabled={page.step4claim.claim.disabled}
                    variant="secondary"
                  >
                    {page.step4claim.claim.loading ? (
                      <Spinner animation="border" size="sm" className="mr-2" />
                    ) : (
                      <i className="icon icon-claim" />
                    )}
                    Claim your payment
                  </ButtonWithWallet>
                }
              />
            </>
          )}
        </div>

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

  if (page.step5) {
    return (
      <>
        {page.step5.state !== 'expired' ? (
          <div className="swap-panel__card">
            {stepByStep}

            <SwapExpiryProgressBar
              show={page.step5.state === 'failed'}
              expired={true}
              timeRemaining={0}
              totalTime={1}
              expiryText="Swap address expired, please do not send any funds!"
              quoteAlias="Swap address"
            />

            <SwapStepAlert
              show={page.step5.state === 'success'}
              type="success"
              icon={ic_check_circle}
              title="Swap success"
              description="Your swap was executed successfully!"
            />

            <SwapStepAlert
              show={page.step5.state === 'failed'}
              type="danger"
              icon={ic_warning}
              title="Swap failed"
              description="Swap address expired without receiving the required funds!"
            />
          </div>
        ) : (
          ''
        )}

        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      </>
    );
  }
}
