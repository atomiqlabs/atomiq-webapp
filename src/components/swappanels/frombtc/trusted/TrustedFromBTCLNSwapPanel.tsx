import * as React from 'react';
import { LnForGasSwap } from '@atomiqlabs/sdk';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { StepByStep } from '../../../swaps/StepByStep';
import { SwapExpiryProgressBar } from '../../../swaps/SwapExpiryProgressBar';
import { SwapStepAlert } from '../../../swaps/SwapStepAlert';
import { BaseButton } from '../../../common/BaseButton';
import { ScrollAnchor } from '../../../ScrollAnchor';
import { useTrustedFromBtcLnQuote } from '../../../../hooks/swaps/useTrustedFromBtcLnQuote';
import { ConnectedWalletPayButtons } from '../../../swaps/ConnectedWalletPayButtons';
import { DisconnectedWalletQrAndAddress } from '../../../swaps/DisconnectedWalletQrAndAddress';

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function TrustedFromBTCLNSwapPanel(props: {
  quote: LnForGasSwap;
  refreshQuote: () => void;
  abortSwap?: () => void;
  continue?: () => void;
}) {
  const page = useTrustedFromBtcLnQuote(props.quote);

  const stepByStep = page.executionSteps ? (
    <StepByStep quote={props.quote} steps={page.executionSteps} />
  ) : (
    ''
  );

  if (page.step1paymentWait) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step1paymentWait.error}
            type={page.step1paymentWait.error?.type}
            icon={ic_warning}
            title={page.step1paymentWait.error?.title}
            error={page.step1paymentWait.error?.error}
            actionElement={
              page.step1paymentWait.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step1paymentWait.error?.retry}
                  variant="secondary"
                >
                  <i className="icon icon-retry" />
                  Retry
                </BaseButton>
              )
            }
          />

          {page.step1paymentWait.walletConnected && (
            <ConnectedWalletPayButtons
              wallet={page.step1paymentWait.walletConnected.lightningWallet}
              payWithBrowserWallet={page.step1paymentWait.walletConnected.payWithWebLn}
              useExternalWallet={page.step1paymentWait.walletConnected.useExternalWallet}
            />
          )}

          {page.step1paymentWait?.walletDisconnected && (
            <DisconnectedWalletQrAndAddress
              address={{
                ...page.step1paymentWait.walletDisconnected.address,
                description: 'Lightning network invoice',
              }}
              payWithDeeplink={{
                ...page.step1paymentWait.walletDisconnected.payWithLnWallet,
                text: 'Pay with LN wallet',
              }}
              payWithBrowserWallet={{
                ...page.step1paymentWait.walletDisconnected.payWithWebLn,
                text: (
                  <>
                    <img
                      className="mr-2"
                      width={20}
                      height={20}
                      src="/wallets/WebLN-outline.svg"
                      alt="WebLN"
                    />
                    Pay with WebLN
                  </>
                ),
              }}
            />
          )}

          {page.step1paymentWait?.walletDisconnected || page.step1paymentWait?.walletConnected ? (
            <div className="swap-panel__card__group">
              <SwapExpiryProgressBar
                timeRemaining={page.step1paymentWait.expiry.remaining}
                totalTime={page.step1paymentWait.expiry.total}
                show={true}
                expiryText="Lighnting network invoice expired, please do not send any funds!"
                quoteAlias="Lightning invoice"
              />
            </div>
          ) : (
            ''
          )}
        </div>

        <ScrollAnchor trigger={!!page.step1paymentWait.walletDisconnected} />

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

  if (page.step2receivingFunds) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2receivingFunds.error}
            type={page.step2receivingFunds.error?.type}
            icon={ic_warning}
            title={page.step2receivingFunds.error?.title}
            error={page.step2receivingFunds.error?.error}
            actionElement={
              page.step2receivingFunds.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step2receivingFunds.error?.retry}
                  variant="secondary"
                >
                  <i className="icon icon-retry" />
                  Retry
                </BaseButton>
              )
            }
          />
        </div>
      </>
    );
  }

  if (page.step3) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={page.step3.state === 'success'}
            type="success"
            icon={ic_check_circle}
            title="Swap success"
            description="Your swap was executed successfully!"
          />

          <SwapStepAlert
            show={page.step3.state === 'failed'}
            type="danger"
            icon={ic_warning}
            title="Swap failed"
            description="Swap HTLC expired, your lightning payment will be refunded shortly!"
          />

          <SwapStepAlert
            show={page.step3.state === 'expired'}
            type="danger"
            icon={ic_warning}
            title="Swap expired"
            description="Swap has expired without being paid!"
          />
        </div>

        <BaseButton
          onClick={page.step3.state === 'success' ? props.continue : props.refreshQuote}
          variant="primary"
          className="swap-panel__action"
        >
          {page.step3.state === 'success' ? 'Continue' : 'New quote'}
        </BaseButton>
      </>
    );
  }
}
