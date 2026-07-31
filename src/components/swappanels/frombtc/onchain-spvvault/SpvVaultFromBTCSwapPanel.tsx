import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import { ISwap, SpvFromBTCSwap } from '@atomiqlabs/sdk';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { SwapPageUIState } from '../../../../hooks/pages/useSwapPage';
import { useSpvVaultFromBtcQuote } from '../../../../hooks/swaps/useSpvVaultFromBtcQuote';
import { StepByStep } from '../../../swaps/StepByStep';
import { SwapStepAlert } from '../../../swaps/SwapStepAlert';
import { ButtonWithWallet } from '../../../wallets/ButtonWithWallet';
import { BaseButton } from '../../../common/BaseButton';
import { SwapConfirmations } from '../../../swaps/SwapConfirmations';
import { SwapFeePanel } from '../../../fees/SwapFeePanel';
import {ChainsConfig} from "../../../../data/ChainsConfig";
import {ImportantNoticeModal} from "../../../swaps/ImportantNoticeModal";
import {ConnectedWalletPayButtons} from "../../../swaps/ConnectedWalletPayButtons";
import {DisconnectedWalletQrAndAddress} from "../../../swaps/DisconnectedWalletQrAndAddress";
import {SwapExpiryProgressBar} from "../../../swaps/SwapExpiryProgressBar";
import {ScrollAnchor} from "../../../ScrollAnchor";

/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */

export function SpvVaultFromBTCSwapPanel(props: {
  quote: SpvFromBTCSwap<any>;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  feeRate?: number;
  balance?: bigint;
}) {
  const page = useSpvVaultFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);

  const stepByStep = page.executionSteps ? (
    <StepByStep quote={props.quote} steps={page.executionSteps} />
  ) : (
    ''
  );

  const swapFees = (
    <div className="mt-3">
      <SwapFeePanel
        swap={props.quote}
        isExpired={page.step6?.state === 'expired' || page.step6?.state === 'expired_uninitialized'}
        onRefreshQuote={props.refreshQuote}
        totalTime={page.step1init?.expiry?.total}
        remainingTime={page.step1init?.expiry?.remaining}
        btcFeeRate={props.feeRate}
      />
    </div>
  );

  if (page.step1init) {
    return (
      <>
        {page.step1init.note && (
          <div className="simple-fee-screen text-start px-3 py-2 mt-3">
            <div className="simple-fee-screen__quote">
              {page.step1init.note.willExecuteAutomatically && (
                <>
                  <span className="icon icon-info"></span>
                  <span>Will automatically execute with already deposited BTC balance</span>
                </>
              )}
              {page.step1init.note.requiredAdditionalDeposit && (
                <>
                  <span className="icon icon-info"></span>
                  <span>Will request an additional deposit of {page.step1init.note.requiredAdditionalDeposit.toString()}</span>
                </>
              )}
            </div>
          </div>
        )}

        {swapFees}

        <SwapStepAlert
          show={!!page.step1init.error}
          type={page.step1init.error?.type ?? 'error'}
          icon={ic_warning}
          title={page.step1init.error?.title}
          description={page.step1init.error?.description}
          error={page.step1init.error?.error}
          action={
            page.step1init.error?.retry
              ? {
                type: 'button',
                text: 'Retry',
                onClick: page.step1init.error.retry,
                variant: 'secondary',
              }
              : undefined
          }
        />

        <BaseButton
          className="swap-panel__action"
          onClick={page.step1init.init.onClick}
          disabled={page.step1init.init.disabled}
          size="lg"
        >
          {page.step1init.init.loading ? (
            <Spinner animation="border" size="sm" className="mr-2" />
          ) : null}
          Swap
        </BaseButton>
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
              , as sending a different amount will not be accepted!
            </>
          }
          buttonText="Understood, copy address"
        />

        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2paymentWait.error}
            type={page.step2paymentWait.error?.type ?? 'error'}
            icon={ic_warning}
            title={page.step2paymentWait.error?.title}
            description={page.step2paymentWait.error?.description}
            error={page.step2paymentWait.error?.error}
            action={
              page.step2paymentWait.error?.requiresRequote
                ? {
                    type: 'button',
                    text: 'Refresh quote',
                    onClick: props.refreshQuote,
                    variant: 'secondary',
                  }
                : page.step2paymentWait.error?.retry
                  ? {
                      type: 'button',
                      text: 'Retry',
                      onClick: page.step2paymentWait.error.retry,
                      variant: 'secondary',
                    }
                  : undefined
            }
          />

          {page.step2paymentWait.backupRequired ? (
            <div className="swap-panel__card__group">
              <SwapStepAlert
                type="warning"
                title="Back up your Bitcoin wallet"
                description="Download and acknowledge the recovery phrase before displaying the intermediate-wallet payment address."
              />
              <BaseButton
                variant="secondary"
                onClick={page.step2paymentWait.backupRequired.backup}
              >
                Back up Bitcoin wallet
              </BaseButton>
            </div>
          ) : null}

          {page.step2paymentWait.walletConnected ? (
            <ConnectedWalletPayButtons
              wallet={page.step2paymentWait.walletConnected.bitcoinWallet}
              payWithBrowserWallet={
                page.step2paymentWait.walletConnected.payWithBrowserWallet
              }
              useExternalWallet={
                page.step2paymentWait.walletConnected.useExternalWallet
              }
            />
          ) : null}

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
                  Send{' '}
                  <strong>
                    EXACTLY {page.step2paymentWait.walletDisconnected.depositStatus?.expectedAmount.toString()}
                  </strong>{' '}
                  to the address below.
                </>
              }
            />
          ) : null}

          <div className="swap-panel__card__group">
            <SwapExpiryProgressBar
              timeRemaining={page.step2paymentWait.expiry.remaining}
              totalTime={page.step2paymentWait.expiry.total}
              expiryText="Quote expired, please do not send any funds!"
              quoteAlias="Quote"
            />
          </div>

          <ScrollAnchor trigger={true} />
        </div>
      </>
    );
  }

  if (page.step3broadcasting) {
    return (
      <div className="swap-panel__card">
        {stepByStep}

        <SwapStepAlert
          show={!!page.step3broadcasting.error}
          type={'warning'}
          icon={ic_warning}
          title={page.step3broadcasting.error?.title}
          error={page.step3broadcasting.error?.error}
          actionElement={
            page.step3broadcasting.error?.retry && (
              <BaseButton
                className="swap-step-alert__button"
                onClick={page.step3broadcasting.error?.retry}
                variant="secondary"
              >
                <i className="icon icon-retry" />
                Retry
              </BaseButton>
            )
          }
        />
      </div>
    );
  }

  if (page.step4awaitingConfirmations) {
    return (
      <div className="swap-panel__card">
        {stepByStep}

        <SwapStepAlert
          show={!!page.step4awaitingConfirmations.error}
          type={'error'}
          icon={ic_warning}
          title={page.step4awaitingConfirmations.error?.title}
          error={page.step4awaitingConfirmations.error?.error}
          actionElement={
            page.step4awaitingConfirmations.error?.retry && (
              <BaseButton
                className="swap-step-alert__button"
                onClick={page.step4awaitingConfirmations.error?.retry}
                variant="secondary"
              >
                <i className="icon icon-retry" />
                Retry
              </BaseButton>
            )
          }
        />

        <SwapConfirmations txData={page.step4awaitingConfirmations.txData} />
      </div>
    );
  }

  if (page.step5claim) {
    return (
      <div className="swap-panel__card">
        {stepByStep}

        <SwapStepAlert
          show={!!page.step5claim.error}
          type={page.step5claim.error?.type}
          icon={ic_warning}
          title={page.step5claim.error?.title}
          error={page.step5claim.error?.error}
          action={page.step5claim.error?.retry && {
            type: 'button',
            text: 'Retry',
            variant: 'secondary',
            onClick: page.step5claim.error?.retry,
            icon: <i className="icon icon-retry"/>
          }}
        />

        {page.step5claim.waitingForWatchtowerClaim ? (
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
                  className="swap-step-alert__button"
                  chainId={props.quote?.chainIdentifier}
                  onClick={page.step5claim.claim.onClick}
                  disabled={page.step5claim.claim.disabled}
                  variant="secondary"
                >
                  {page.step5claim.claim.loading ? (
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
    );
  }

  if (page.step6) {
    return (
      <>
        {page.step6.state === 'expired_uninitialized' && swapFees}

        <div className="swap-panel__card">
          {page.step6.state !== 'expired_uninitialized' ? stepByStep : ''}

          <SwapStepAlert
            show={page.step6.state === 'success'}
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
            show={page.step6.state === 'failed' || page.step6.state === 'expired'}
            type="danger"
            icon={ic_warning}
            title={page.step6.errorTitle}
            description={page.step6.errorMessage}
          />
        </div>

        <BaseButton onClick={() => props.refreshQuote()} variant="primary" className="swap-panel__action">
          New Swap
        </BaseButton>
      </>
    );
  }
}
