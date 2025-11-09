import * as React from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { SpvFromBTCSwap, SpvFromBTCSwapState } from '@atomiqlabs/sdk';
import { getDeltaText } from '../../utils/Utils';
import { FEConstants } from '../../FEConstants';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { useAsync } from '../../utils/hooks/useAsync';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';

import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_circle_outline } from 'react-icons-kit/md/ic_check_circle_outline';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { SingleStep, StepByStep } from '../../components/StepByStep';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { useAbortSignalRef } from '../../utils/hooks/useAbortSignal';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ic_refresh } from 'react-icons-kit/md/ic_refresh';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import {useSpvVaultFromBtcQuote} from "./useSpvVaultFromBtcQuote";

/*
Steps:
1. Bitcoin payment -> Broadcasting bitcoin transaction -> Waiting bitcoin confirmations -> Bitcoin confirmed
2. Claim transaction -> Sending claim transaction -> Claim success
 */

export function SpvVaultFromBTCQuoteSummary(props: {
  quote: SpvFromBTCSwap<any>;
  refreshQuote: () => void;
  setAmountLock: (isLocked: boolean) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  feeRate?: number;
  balance?: bigint;
}) {
  const page = useSpvVaultFromBtcQuote(props.quote, props.setAmountLock, props.feeRate, props.balance);

  return (
    <>
      {page.executionSteps ? <StepByStep quote={props.quote} steps={page.executionSteps} /> : ''}

      {page.step1init ? (
        <>
          {/*NOTE: I think this is not actually necessary since expiry is already shown in the fee summary*/}
          <SwapExpiryProgressBar
            expired={false}
            timeRemaining={page.step1init.expiry?.remaining}
            totalTime={page.step1init.expiry?.total}
            show={!!page.step1init.expiry}
            type="bar"
            quoteAlias="Quote"
          />

          <ErrorAlert className="mb-3" title={page.step1init.error?.title} error={page.step1init.error?.error} />

          <ButtonWithWallet
            chainId="BITCOIN"
            onClick={page.step1init.init?.onClick}
            className="swap-panel__action"
            disabled={page.step1init.init?.disabled}
            size="lg"
          >
            {page.step1init.init?.loading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
            Pay with <img width={20} height={20} src={page.step1init.bitcoinWallet?.icon} /> {page.step1init.bitcoinWallet?.name}
          </ButtonWithWallet>
        </>
      ) : (
        ''
      )}

      {page.step2broadcasting ? (
        <div className="d-flex flex-column align-items-center gap-2 tab-accent">
          <Spinner />
          <small className="mt-2">Sending bitcoin transaction...</small>
        </div>
      ) : (
        ''
      )}

      {page.step3awaitingConfirmations ? (
        <div className="d-flex flex-column align-items-center tab-accent">
          <small className="mb-2">Transaction received, waiting for confirmations...</small>

          <Spinner />
          <label>
            {page.step3awaitingConfirmations.txData.confirmations.actual} / {page.step3awaitingConfirmations.txData.confirmations.required}
          </label>
          <label style={{ marginTop: '-6px' }}>Confirmations</label>

          <a
            className="mb-2 text-overflow-ellipsis text-nowrap overflow-hidden"
            style={{ width: '100%' }}
            target="_blank"
            href={FEConstants.btcBlockExplorer + page.step3awaitingConfirmations.txData.txId}
          >
            <small>{page.step3awaitingConfirmations.txData.txId}</small>
          </a>

          <Badge
            className={'text-black' + (page.step3awaitingConfirmations.txData.eta == null ? ' d-none' : '')}
            bg="light"
            pill
          >
            ETA: {page.step3awaitingConfirmations.txData.eta.text}
          </Badge>

          {page.step3awaitingConfirmations.error != null ? (
            <>
              <ErrorAlert
                className="my-3 width-fill"
                title={page.step3awaitingConfirmations.error.title}
                error={page.step3awaitingConfirmations.error.error}
              />
              <Button onClick={page.step3awaitingConfirmations.error.retry} className="width-fill" variant="secondary">
                Retry
              </Button>
            </>
          ) : (
            ''
          )}
        </div>
      ) : (
        ''
      )}

      {page.step4claim && page.step4claim.waitingForWatchtowerClaim ? (
        <div className="d-flex flex-column align-items-center tab-accent">
          <Spinner />
          <small className="mt-2">
            Transaction received & confirmed, waiting for claim by watchtowers...
          </small>
        </div>
      ) : (
        ''
      )}

      {page.step4claim && !page.step4claim.waitingForWatchtowerClaim ? (
        <>
          <div className="d-flex flex-column align-items-center tab-accent mb-3">
            <label>Transaction received & confirmed, you can claim your funds manually now!</label>
          </div>

          <ErrorAlert className="mb-3" title={page.step4claim.error?.title} error={page.step4claim.error?.error} />

          <ButtonWithWallet
            chainId={props.quote.chainIdentifier}
            className="swap-panel__action"
            onClick={page.step4claim.claim.onClick}
            disabled={page.step4claim.claim.disabled}
            size="lg"
          >
            {page.step4claim.claim.loading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
            Finish swap (claim funds)
          </ButtonWithWallet>
        </>
      ) : (
        ''
      )}

      {page.step5?.state==="success" ? (
        <Alert variant="success" className="mb-3">
          <strong>Swap success</strong>
          <label>Your swap was executed successfully!</label>
        </Alert>
      ) : (
        ''
      )}

      {page.step5?.state==="failed" ? (
        <Alert variant="danger" className="mb-3">
          <strong>Swap failed</strong>
          <label>Swap transaction reverted, no funds were sent!</label>
        </Alert>
      ) : (
        ''
      )}

      {/*NOTE: I think this is not actually necessary since expiry is already shown in the fee summary*/}
      {page.step5?.state==="expired" ? (
        <SwapExpiryProgressBar
          expired={true}
          timeRemaining={0}
          totalTime={1}
          show={true}
          type="bar"
          expiryText="Quote expired!"
          quoteAlias="Quote"
        />
      ) : (
        ''
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
