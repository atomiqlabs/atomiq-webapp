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
import { ImportantNoticeModal } from '../../../swaps/ImportantNoticeModal';
import { DisconnectedWalletQrAndAddress } from '../../../swaps/DisconnectedWalletQrAndAddress';
import { SwapExpiryProgressBar } from '../../../swaps/SwapExpiryProgressBar';
import { ScrollAnchor } from '../../../ScrollAnchor';
import { ChainsConfig } from '../../../../data/ChainsConfig';

/*
Steps:
1. Bitcoin payment -> Awaiting bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
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
  const page = useSpvVaultFromBtcQuote(
    props.quote,
    props.UICallback,
    props.feeRate,
    props.balance,
    props.abortSwap
  );

  const stepByStep = page.executionSteps && <StepByStep quote={props.quote} steps={page.executionSteps} />;

  const swapFees = (
    <div className="mt-3">
      <SwapFeePanel
        swap={props.quote}
        isExpired={page.step5?.state === 'expired_uninitialized'}
        onRefreshQuote={props.refreshQuote}
        totalTime={page.step1init?.expiry?.total}
        remainingTime={page.step1init?.expiry?.remaining}
        btcFeeRate={props.feeRate}
      />
    </div>
  );

  if (page.step1init) {
    const showConnectBitcoinWallet =
      props.quote.getDepositWalletType() !== 'waitpayment' && !page.step1init.bitcoinWallet;

    return (
      <>
        <ImportantNoticeModal
          opened={!!page.step1init.backupWarningModal}
          close={page.step1init.backupWarningModal?.close}
          setShowAgain={page.step1init.backupWarningModal?.showAgain.onChange}
          text={
            <>
              Make sure you have backed up your Bitcoin web wallet recovery phrase before
              continuing.
            </>
          }
          buttonText="Understood, continue"
        />

        {swapFees}

        <SwapStepAlert
          show={!!page.step1init.error}
          type="error"
          icon={ic_warning}
          title={page.step1init.error?.title}
          error={page.step1init.error?.error}
        />

        {showConnectBitcoinWallet ? (
          <ButtonWithWallet chainId="BITCOIN" className="swap-panel__action" size="lg">
            Swap
          </ButtonWithWallet>
        ) : (
          <>
            {!!page.step1init.init &&
                <BaseButton
                    onClick={page.step1init.init.onClick}
                    className="swap-panel__action"
                    disabled={page.step1init.init.disabled}
                    size="lg"
                >
                  {page.step1init.init.loading ? (
                    <Spinner animation="border" size="sm" className="mr-2" />
                  ) : (
                    ''
                  )}Swap
                </BaseButton>
            }
          </>
        )}
      </>
    );
  }

  if (page.step2paymentWait) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2paymentWait.error}
            type={page.step2paymentWait.error?.type}
            icon={ic_warning}
            title={page.step2paymentWait.error?.title}
            error={page.step2paymentWait.error?.error}
            actionElement={
              page.step2paymentWait.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step2paymentWait.error.retry}
                  variant="secondary"
                >
                  <i className="icon icon-retry" />
                  Retry
                </BaseButton>
              )
            }
          />

          <DisconnectedWalletQrAndAddress
            address={{
              ...page.step2paymentWait.address,
              description: 'Bitcoin wallet address',
            }}
            payWithDeeplink={{
              ...page.step2paymentWait.payWithBitcoinWallet,
              text: 'Pay with BTC wallet',
            }}
            payWithBrowserWallet={{
              ...page.step2paymentWait.payWithBrowserWallet,
              text: 'Pay with browser wallet',
            }}
            alert={
              <>
                Send <strong>EXACTLY {props.quote.getInput().toString()}</strong> to the address
                below.
              </>
            }
          />

          <div className="swap-panel__card__group">
            <SwapExpiryProgressBar
              timeRemaining={page.step2paymentWait.expiry.remaining}
              totalTime={page.step2paymentWait.expiry.total}
              expiryText="Swap address expired, please do not send any funds!"
              quoteAlias="Swap address"
            />
          </div>

          <ScrollAnchor trigger={true} />
        </div>

        <BaseButton
          onClick={() => {
            if(props.quote!=null) props.quote.abortSwap();
            props.abortSwap();
          }}
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
    );
  }

  if (page.step4claim) {
    return (
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
            icon: <i className="icon icon-retry" />,
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
    );
  }

  if (page.step5) {
    return (
      <>
        {page.step5.state === 'expired_uninitialized' && swapFees}

        <div className="swap-panel__card">
          {page.step5.state !== 'expired_uninitialized' ? stepByStep : ''}

          {page.step5.state === 'success' ? (
            <SwapStepAlert
              type="success"
              icon={ic_check_circle}
              title="Swap success"
              description="Your swap was executed successfully!"
              action={
                ChainsConfig[props.quote.chainIdentifier]?.blockExplorer != null
                  ? {
                      type: 'link',
                      text: 'View transaction',
                      href:
                        ChainsConfig[props.quote.chainIdentifier].blockExplorer +
                        props.quote.getOutputTxId(),
                    }
                  : undefined
              }
            />
          ) : (
            ''
          )}

          {page.step5.state === 'failed' ? (
            <SwapStepAlert
              type="danger"
              icon={ic_warning}
              title="Swap failed"
              description="Swap transaction reverted, no funds were sent!"
            />
          ) : (
            ''
          )}

          {page.step5.state === 'expired' ? (
            <SwapStepAlert
              type="danger"
              icon={ic_warning}
              title="Swap expired"
              description={
                <>
                  <div>Swap expired before the transaction was received!</div>
                  <div>
                    In case <strong>you've already sent the BTC</strong>, just create a new swap, your already
                    deposited balance will be immediately available!
                  </div>
                </>
              }
            />
          ) : (
            ''
          )}

          {page.step5.state === 'deposit_error' ? (
            <SwapStepAlert
              type="danger"
              icon={ic_warning}
              title={page.step5.depositIssue?.title}
              description={page.step5.depositIssue?.description}
              action={{
                type: 'button',
                text: 'Request New Quote',
                variant: 'secondary',
                onClick: () => props.refreshQuote(),
              }}
            />
          ) : (
            ''
          )}
        </div>

        {page.step5.state !== 'deposit_error' &&
          <BaseButton
              onClick={() => props.refreshQuote()}
              variant="primary"
              className="swap-panel__action"
          >
              New Swap
          </BaseButton>}

      </>
    );
  }
}
