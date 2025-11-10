import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import { ISwap, SpvFromBTCSwap } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { SwapConfirmations } from '../components/SwapConfirmations';
import { StepByStep } from '../../components/StepByStep';
import { ErrorAlert } from '../../components/ErrorAlert';
import { BaseButton } from '../../components/BaseButton';
import { useSpvVaultFromBtcQuote } from './useSpvVaultFromBtcQuote';
import { SwapPageUIState } from '../../pages/useSwapPage';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';

/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */

export function SpvVaultFromBTCQuoteSummary(props: {
  quote: SpvFromBTCSwap<any>;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  feeRate?: number;
  balance?: bigint;
}) {
  const page = useSpvVaultFromBtcQuote(props.quote, props.UICallback, props.feeRate, props.balance);

  return (
    <>
      <div className="swap-panel__card">
        {page.executionSteps ? <StepByStep quote={props.quote} steps={page.executionSteps} /> : ''}

        {page.step1init ? (
          <>
            <ErrorAlert
              className="mb-3"
              title={page.step1init.error?.title}
              error={page.step1init.error?.error}
            />
          </>
        ) : (
          ''
        )}

        {(page.step3awaitingConfirmations || page.step4claim) && (
          <SwapConfirmations
            txData={
              page.step3awaitingConfirmations
                ? {
                    txId: page.step3awaitingConfirmations.txData.txId,
                    confirmations: page.step3awaitingConfirmations.txData.confirmations.actual,
                    confTarget: page.step3awaitingConfirmations.txData.confirmations.required,
                    txEtaMs: page.step3awaitingConfirmations.txData.eta?.millis ?? -1,
                  }
                : null
            }
            isClaimable={!!page.step4claim}
            claimable={page.step4claim ? !page.step4claim.waitingForWatchtowerClaim : false}
            chainId={props.quote.chainIdentifier}
            onClaim={page.step4claim?.claim.onClick}
            claimLoading={page.step4claim?.claim.loading}
            claimError={page.step4claim?.error?.error}
          />
        )}

        {page.step5?.state === 'success' ? (
          <SwapStepAlert
            type="success"
            icon={ic_check_circle}
            title="Swap success"
            description="Your swap was executed successfully!"
            className="mb-3"
          />
        ) : (
          ''
        )}

        {page.step5?.state === 'failed' ? (
          <SwapStepAlert
            type="danger"
            title="Swap failed"
            description="Swap transaction reverted, no funds were sent!"
            className="mb-3"
          />
        ) : (
          ''
        )}

        {/*/!*NOTE: I think this is not actually necessary since expiry is already shown in the fee summary*!/*/}
        {/*{page.step5?.state === 'expired' ? (*/}
        {/*  <SwapExpiryProgressBar*/}
        {/*    expired={true}*/}
        {/*    timeRemaining={0}*/}
        {/*    totalTime={1}*/}
        {/*    show={true}*/}
        {/*    type="bar"*/}
        {/*    expiryText="Quote expired!"*/}
        {/*    quoteAlias="Quote"*/}
        {/*  />*/}
        {/*) : (*/}
        {/*  ''*/}
        {/*)}*/}
      </div>

      {page.step1init && (
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
      )}

      {page.step5 ? (
        <BaseButton
          onClick={props.refreshQuote}
          className="swap-panel__action"
          variant="primary"
          size="large"
        >
          New quote
        </BaseButton>
      ) : (
        ''
      )}
    </>
  );
}
