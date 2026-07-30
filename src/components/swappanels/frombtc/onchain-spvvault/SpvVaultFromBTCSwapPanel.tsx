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
        isExpired={page.step5?.state === 'expired'}
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
        <ImportantNoticeModal
          opened={!!page.step1init.walletDisconnected?.addressCopyWarningModal}
          close={page.step1init.walletDisconnected?.addressCopyWarningModal?.close}
          setShowAgain={
            page.step1init.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange
          }
          text={
            <>
              Make sure you send{' '}
              <b>
                EXACTLY{' '}
                {page.step1init.walletDisconnected?.addressCopyWarningModal?.btcAmount.toString()}
              </b>
              , as sending a different amount will not be accepted!
            </>
          }
          buttonText="Understood, copy address"
        />

        {swapFees}

        <div className="swap-panel__card">
          <SwapStepAlert
            show={!!page.step1init.error}
            type={page.step1init.error?.type ?? 'error'}
            icon={ic_warning}
            title={page.step1init.error?.title}
            description={page.step1init.error?.description}
            error={page.step1init.error?.error}
            action={
              page.step1init.error?.requiresRequote
                ? {
                    type: 'button',
                    text: 'Refresh quote',
                    onClick: props.refreshQuote,
                    variant: 'secondary',
                  }
                : page.step1init.error?.retry
                  ? {
                      type: 'button',
                      text: 'Retry',
                      onClick: page.step1init.error.retry,
                      variant: 'secondary',
                    }
                  : undefined
            }
          />

          {page.step1init.backupRequired ? (
            <div className="swap-panel__card__group">
              <SwapStepAlert
                type="warning"
                title="Back up your Bitcoin wallet"
                description="Download and acknowledge the recovery phrase before displaying the intermediate-wallet payment address."
              />
              <BaseButton
                variant="secondary"
                onClick={page.step1init.backupRequired.backup}
              >
                Back up Bitcoin wallet
              </BaseButton>
            </div>
          ) : null}

          {page.step1init.walletConnected ? (
            <ConnectedWalletPayButtons
              wallet={page.step1init.walletConnected.bitcoinWallet}
              payWithBrowserWallet={
                page.step1init.walletConnected.payWithBrowserWallet
              }
              useExternalWallet={
                page.step1init.walletConnected.useExternalWallet
              }
            />
          ) : null}

          {page.step1init.walletDisconnected && page.step1init.walletDisconnected.depositStatus?.invalidDeposits==null ? (
            <DisconnectedWalletQrAndAddress
              address={{
                ...page.step1init.walletDisconnected.address,
                description: 'Bitcoin wallet address',
              }}
              payWithDeeplink={{
                ...page.step1init.walletDisconnected.payWithBitcoinWallet,
                text: 'Pay with BTC wallet',
              }}
              payWithBrowserWallet={{
                ...page.step1init.walletDisconnected.payWithBrowserWallet,
                text: 'Pay with browser wallet',
              }}
              alert={
                <>
                  Send{' '}
                  <strong>
                    EXACTLY {page.step1init.walletDisconnected.depositStatus?.expectedAmount.toString()}
                  </strong>{' '}
                  to the address below.
                </>
              }
            />
          ) : null}

          <div className="swap-panel__card__group">
            <SwapExpiryProgressBar
              timeRemaining={page.step1init.expiry.remaining}
              totalTime={page.step1init.expiry.total}
              expiryText="Quote expired, please do not send any funds!"
              quoteAlias="Quote"
            />
          </div>

          <ScrollAnchor trigger={true} />
        </div>
      </>
    );
  }

  if (page.step2broadcasting) {
    return (
      <div className="swap-panel__card">
        {stepByStep}

        <SwapStepAlert
          show={!!page.step2broadcasting.error}
          type={'warning'}
          icon={ic_warning}
          title={page.step2broadcasting.error?.title}
          error={page.step2broadcasting.error?.error}
          actionElement={
            page.step2broadcasting.error?.retry && (
              <BaseButton
                className="swap-step-alert__button"
                onClick={page.step2broadcasting.error?.retry}
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

  if (page.step3awaitingConfirmations) {
    return (
      <div className="swap-panel__card">
        {stepByStep}

        <SwapStepAlert
          show={!!page.step3awaitingConfirmations.error}
          type={'error'}
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

        <SwapConfirmations txData={page.step3awaitingConfirmations.txData} />
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
        {page.step5.state === 'expired' && swapFees}

        <div className="swap-panel__card">
          {page.step5.state !== 'expired' ? stepByStep : ''}

          {page.step5.state === 'success' ? (
            <SwapStepAlert
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
        </div>

        {page.step5.showConnectWalletButton
          ? <ButtonWithWallet
            className="swap-panel__action"
            chainId="BITCOIN"
          />
          : <BaseButton onClick={() => props.refreshQuote()} variant="primary" className="swap-panel__action">
            New Swap
          </BaseButton>
        }
      </>
    );
  }
}
