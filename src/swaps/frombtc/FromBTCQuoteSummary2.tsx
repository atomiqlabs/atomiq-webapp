import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { AlertMessage } from '../../components/AlertMessage';
import { QRCodeSVG } from 'qrcode.react';
import { ValidatedInputRef } from '../../components/ValidatedInput';
import { FromBTCSwap, FromBTCSwapState } from '@atomiqlabs/sdk';
import {FEConstants, Tokens} from '../../FEConstants';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { CopyOverlay } from '../../components/CopyOverlay';
import { useSwapState } from '../hooks/useSwapState';
import { useAsync } from '../../utils/hooks/useAsync';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';

import { ic_gavel_outline } from 'react-icons-kit/md/ic_gavel_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_watch_later_outline } from 'react-icons-kit/md/ic_watch_later_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_receipt } from 'react-icons-kit/md/ic_receipt';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { SingleStep, StepByStep } from '../../components/StepByStep';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { useAbortSignalRef } from '../../utils/hooks/useAbortSignal';
import { OnchainAddressCopyModal } from '../components/OnchainAddressCopyModal';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { ChainDataContext } from '../../wallets/context/ChainDataContext';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import { WalletData } from '../../components/StepByStep';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { WalletAddressPreview } from '../../components/WalletAddressPreview';
import { SwapConfirmations, TxData } from '../components/SwapConfirmations';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import {useFromBtcQuote} from "./useFromBtcQuote";
import {getDeltaText} from "../../utils/Utils";
import {ErrorAlert} from "../../components/ErrorAlert";

/*
Steps:
1. Opening swap address -> Swap address opened
2. Bitcoin payment -> Awaiting bitcoin payment -> Waiting bitcoin confirmations -> Bitcoin confirmed
3. Claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCQuoteSummary2(props: {
  quote: FromBTCSwap<any>;
  refreshQuote: () => void;
  setAmountLock: (isLocked: boolean) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
  feeRate?: number;
  balance?: bigint;
}) {
  const page = useFromBtcQuote(props.quote, props.setAmountLock, props.feeRate, props.balance);

  const stepByStep = page.executionSteps ? <StepByStep
    quote={props.quote}
    steps={page.executionSteps}
  /> : '';

  //TODO: This should be contained in a standalone component
  const addressContent = useCallback(
    (show) => (
      <>
        <AlertMessage variant="warning" className="mb-3">
          Send{' '}
          <strong>
            EXACTLY {props.quote.getInput().toString()}
          </strong>{' '}
          to the address below.
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
          chainName={"Bitcoin"}
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

  if(page.step1init) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step1init.error}
            type="error"
            icon={ic_warning}
            title={page.step1init.error?.title}
            description={page.step1init.error?.error.message}
            error={page.step1init.error?.error}
          />

          <SwapForGasAlert notEnoughForGas={page.step1init?.additionalGasRequired?.rawAmount} quote={props.quote} />
        </div>

        <ButtonWithWallet
          requiredWalletAddress={props.quote._getInitiator()}
          chainId={props.quote.chainIdentifier}
          onClick={page.step1init.init.onClick}
          disabled={page.step1init.init.disabled}
          size="lg"
          className="swap-panel__action"
        >
          {page.step1init.init.loading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
          Swap
        </ButtonWithWallet>
      </>
    )
  }

  if(page.step2paymentWait) {
    return (
      <>
        <OnchainAddressCopyModal
          amountBtc={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.btcAmount.amount}
          opened={!!page.step2paymentWait.walletDisconnected?.addressCopyWarningModal}
          close={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.close}
          setShowCopyWarning={page.step2paymentWait.walletDisconnected?.addressCopyWarningModal?.showAgain.onChange}
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
                    <Spinner animation="border" size="sm" className="mr-2"/>
                  ) : (
                    ''
                  )}
                  Pay with{' '}
                  <img width={20} height={20} src={page.step2paymentWait.walletConnected.bitcoinWallet.icon}/>{' '}
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
            ) : ''}
            {page.step2paymentWait.walletDisconnected ? (
              <CopyOverlay placement={'top'}>{addressContent}</CopyOverlay>
            ) : ''}
          </div>

          <div className="swap-panel__card__group">
            <SwapExpiryProgressBar
              timeRemaining={page.step2paymentWait.expiry.remaining}
              totalTime={page.step2paymentWait.expiry.total}
              type="bar"
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
            action={page.step2paymentWait.error?.retry ? {
              type: 'button',
              text: 'Retry',
              onClick: page.step2paymentWait.error?.retry,
              variant: 'secondary',
            } : undefined}
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

  if(page.step3awaitingConfirmations) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          {page.step3awaitingConfirmations.broadcasting ? (
            <div className="swap-panel__card__group">
              <div className="d-flex flex-column align-items-center p-2 gap-3">
                <Spinner/>
                <label>Sending Bitcoin transaction...</label>
              </div>
            </div>
          ) : (
            <div className="swap-confirmations">
              {/*
                TODO: Extract this to separate component, something like SwapConfirmations - but
                 ONLY handle tx confirmation showing, no claiming and other BS
                */}
              <div className="swap-confirmations__name">
                Transaction received, waiting for confirmations...
              </div>

              <div className="swap-confirmations__estimate">
                <Spinner/>
                <div className="swap-confirmations__estimate__info">
                  <div className="swap-confirmations__estimate__item">
                    {page.step3awaitingConfirmations.txData.confirmations.actual} / {page.step3awaitingConfirmations.txData.confirmations.required} Confirmations
                  </div>
                  <div className="swap-confirmations__estimate__item is-eta">
                    ETA: {page.step3awaitingConfirmations.txData.eta.text}
                  </div>
                </div>
              </div>

              <a
                href={FEConstants.btcBlockExplorer + page.step3awaitingConfirmations.txData.txId}
                target="_blank"
                className="swap-confirmations__link"
              >
                <div className="sc-text">View transaction</div>
                <div className="icon icon-new-window"></div>
              </a>
            </div>
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
    )
  }

  if(page.step4claim) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          {page.step4claim.waitingForWatchtowerClaim ? (
            <div className="swap-confirmations">
              <div className="swap-confirmations__estimate">
                <Spinner/>
              </div>
              <div className="swap-confirmations__name">
                Transaction received & confirmed, waiting for claim by watchtowers...
              </div>
            </div>
          ) : (
            <div className="swap-confirmations">
              <div className="swap-confirmations__name">
                Transaction received & confirmed, you can claim your funds manually now!
              </div>

              {page.step4claim.error && (
                <ErrorAlert className="mb-3" title={page.step4claim.error.title} error={page.step4claim.error.error}/>
              )}

              <ButtonWithWallet
                chainId={props.quote.chainIdentifier}
                onClick={page.step4claim.claim.onClick}
                disabled={page.step4claim.claim.disabled}
                size="lg"
              >
                {page.step4claim.claim.loading ? <Spinner animation="border" size="sm" className="mr-2"/> : ''}
                Finish swap (claim funds)
              </ButtonWithWallet>
            </div>
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

  if(page.step5) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapExpiryProgressBar
            show={page.step5.state==="failed"}
            expired={true}
            timeRemaining={0}
            totalTime={1}
            type="bar"
            expiryText="Swap address expired, please do not send any funds!"
            quoteAlias="Swap address"
          />

          <SwapStepAlert
            show={page.step5.state==="success"}
            type="success"
            icon={ic_check_circle}
            title="Swap success"
            description="Your swap was executed successfully!"
          />

          <SwapStepAlert
            show={page.step5.state==="failed"}
            type="danger"
            icon={ic_warning}
            title="Swap failed"
            description="Swap address expired without receiving the required funds!"
          />
        </div>

        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      </>
    )
  }

}
