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
        {swapFees}

        <SwapStepAlert
          show={!!page.step1init.error}
          type="error"
          icon={ic_warning}
          title={page.step1init.error?.title}
          error={page.step1init.error?.error}
        />

        <ButtonWithWallet
          chainId="BITCOIN"
          onClick={page.step1init.init?.onClick}
          className="swap-panel__action"
          disabled={page.step1init.init?.disabled}
          size="lg"
        >
          {page.step1init.init?.loading ? (
            <Spinner animation="border" size="sm" className="mr-2" />
          ) : (
            ''
          )}
          Pay with <img width={20} height={20} src={page.step1init.bitcoinWallet?.icon} />{' '}
          {page.step1init.bitcoinWallet?.name}
        </ButtonWithWallet>
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
          : <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
            New Swap
          </BaseButton>
        }
      </>
    );
  }
}
