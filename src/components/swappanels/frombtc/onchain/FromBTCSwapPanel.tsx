import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import { FromBTCSwap, ISwap } from '@atomiqlabs/sdk';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { SwapPageUIState } from '../../../../hooks/pages/useSwapPage';
import { useFromBtcQuote } from '../../../../hooks/swaps/useFromBtcQuote';
import { SwapForGasAlert } from '../../../swaps/SwapForGasAlert';
import { StepByStep } from '../../../swaps/StepByStep';
import { SwapStepAlert } from '../../../swaps/SwapStepAlert';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { ImportantNoticeModal } from '../../../swaps/ImportantNoticeModal';
import { BaseButton } from '../../../common/BaseButton';
import { ConnectedWalletPayButtons } from '../../../swaps/ConnectedWalletPayButtons';
import { DisconnectedWalletQrAndAddress } from '../../../swaps/DisconnectedWalletQrAndAddress';
import { SwapExpiryProgressBar } from '../../../swaps/SwapExpiryProgressBar';
import { ScrollAnchor } from '../../../ScrollAnchor';
import { SwapConfirmations } from '../../../swaps/SwapConfirmations';
import { SwapFeePanel } from '../../../fees/SwapFeePanel';
import {ChainsConfig} from "../../../../data/ChainsConfig";

/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCSwapPanel(props: {
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

  const gasAlert = (
    <SwapForGasAlert notEnoughForGas={page.additionalGasRequired} quote={props.quote} />
  );

  const stepByStep = page.executionSteps && (
    <StepByStep quote={props.quote} steps={page.executionSteps} />
  );

  const swapFees = (
    <div className="mt-3">
      <SwapFeePanel
        swap={props.quote}
        isExpired={page.step5?.state === 'expired'}
        onRefreshQuote={props.refreshQuote}
        totalTime={page.step1init?.expiry.total}
        remainingTime={page.step1init?.expiry.remaining}
        btcFeeRate={props.feeRate}
      />
    </div>
  );

  if (page.step1init) {
    return (
      <>
        {swapFees}

        <SwapStepAlert
          show={!!page.step1init.error}
          type="error"
          icon={ic_warning}
          title={page.step1init.error?.title}
          error={page.step1init.error?.error}
        />

        {gasAlert}

        {!!page.step1init.init && (
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
        )}
      </>
    );
  }

  if (page.step2paymentWait) {
    return (
      <>
        <ImportantNoticeModal
          opened={!!page.step2paymentWait.walletDisconnected?.addressCopyWarningModal}
          close={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.close}
          setShowAgain={
            page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange
          }
          text={
            <>
              Make sure you send{' '}
              <b>
                EXACTLY{' '}
                {page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.btcAmount.toString()}
              </b>
              , as sending a different amount will not be accepted, and you might lose your funds!
            </>
          }
          buttonText="Understood, copy address"
        />

        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2paymentWait.error}
            type={page.step2paymentWait.error?.type}
            title={page.step2paymentWait.error?.title}
            error={page.step2paymentWait.error?.error}
            actionElement={
              page.step2paymentWait.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step2paymentWait.error?.retry}
                  variant="secondary"
                >
                  <i className="icon icon-retry" />
                  Retry
                </BaseButton>
              )
            }
          />

          {page.step2paymentWait.walletConnected ? (
            <ConnectedWalletPayButtons
              wallet={page.step2paymentWait.walletConnected.bitcoinWallet}
              payWithBrowserWallet={page.step2paymentWait.walletConnected.payWithBrowserWallet}
              useExternalWallet={page.step2paymentWait.walletConnected.useExternalWallet}
            />
          ) : (
            ''
          )}

          {page.step2paymentWait.walletDisconnected ? (
            <DisconnectedWalletQrAndAddress
              address={{
                ...page.step2paymentWait.walletDisconnected.address,
                description: 'Bitcoin wallet address',
              }}
              payWithDeeplink={{
                ...page.step2paymentWait.walletDisconnected.payWithBitcoinWallet,
                text: 'Pay with BTC wallet',
              }}
              payWithBrowserWallet={{
                ...page.step2paymentWait.walletDisconnected.payWithBrowserWallet,
                text: 'Pay with browser wallet',
              }}
              alert={
                <>
                  Send <strong>EXACTLY {props.quote.getInput().toString()}</strong> to the address
                  below.
                </>
              }
            />
          ) : (
            ''
          )}

          {page.step2paymentWait?.walletDisconnected || page.step2paymentWait?.walletConnected ? (
            <div className="swap-panel__card__group">
              <SwapExpiryProgressBar
                timeRemaining={page.step2paymentWait.expiry.remaining}
                totalTime={page.step2paymentWait.expiry.total}
                expiryText="Swap address expired, please do not send any funds!"
                quoteAlias="Swap address"
              />
            </div>
          ) : (
            ''
          )}

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

          <SwapStepAlert
            show={!!page.step3awaitingConfirmations.error}
            type={'warning'}
            icon={ic_warning}
            title={page.step3awaitingConfirmations.error?.title}
            error={page.step3awaitingConfirmations.error?.error}
            actionElement={
              page.step3awaitingConfirmations.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step3awaitingConfirmations.error?.retry}
                  variant="secondary"
                >
                  <i className="icon icon-retry" />
                  Retry
                </BaseButton>
              )
            }
          />

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

          <SwapStepAlert
            show={!!page.step4claim.error}
            type={page.step4claim.error?.type}
            icon={ic_warning}
            title={page.step4claim.error?.title}
            error={page.step4claim.error?.error}
            action={page.step4claim.error?.retry && {
              type: 'button',
              text: 'Retry',
              variant: 'secondary',
              onClick: page.step4claim.error?.retry,
              icon: <i className="icon icon-retry"/>
            }}
          />

          {page.step4claim.waitingForWatchtowerClaim ? (
            <div className="swap-confirmations">
              <div className="swap-confirmations__estimate">
                <Spinner />
              </div>
              <div className="swap-confirmations__name">
                Transaction received & confirmed, waiting for automatic settlement by watchtowers...
              </div>
            </div>
          ) : (
            <>
              <SwapStepAlert
                show={true}
                type="success"
                icon={ic_check_circle}
                title="Manual swap settlement"
                description="Automatic settlement has failed. You can now settle your swap manually to finish the swap."
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
                    Settle swap
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
        {page.step5.state === 'expired' && swapFees}

        <div className="swap-panel__card">
          {page.step5.state !== 'expired' && stepByStep}

          <SwapStepAlert
            show={page.step5.state === 'success'}
            type="success"
            icon={ic_check_circle}
            title="Swap success"
            description="Your swap was executed successfully!"
            action={
              ChainsConfig[props.quote.chainIdentifier]?.blockExplorer!=null
                ? {
                  type: 'link',
                  text: 'View transaction',
                  href: ChainsConfig[props.quote.chainIdentifier].blockExplorer + props.quote.getOutputTxId(),
                }
                : undefined
            }
          />

          <SwapStepAlert
            show={page.step5.state === 'failed'}
            type="danger"
            icon={ic_warning}
            title="Swap failed"
            description="Swap address expired, please do not send any funds!"
          />
        </div>

        {gasAlert}

        {page.step5.showConnectWalletButton
          ? <ButtonWithWallet
            className="swap-panel__action"
            chainId={props.quote.chainIdentifier}
          />
          : <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
            New Swap
          </BaseButton>
        }
      </>
    );
  }
}
