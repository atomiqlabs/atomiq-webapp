import * as React from 'react';
import { useContext, useEffect, useMemo } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import {
  AbstractSigner, ISwap,
  IToBTCSwap,
  SwapType,
  ToBTCLNSwap,
  ToBTCSwapState,
  toHumanReadableString,
} from '@atomiqlabs/sdk';
import { FEConstants } from '../../FEConstants';
import { SwapsContext } from '../context/SwapsContext';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { useAsync } from '../../utils/hooks/useAsync';
import { useAbortSignalRef } from '../../utils/hooks/useAbortSignal';
import { useStateRef } from '../../utils/hooks/useStateRef';

import { ic_play_circle_outline } from 'react-icons-kit/md/ic_play_circle_outline';
import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_flash_on_outline } from 'react-icons-kit/md/ic_flash_on_outline';
import { ic_hourglass_disabled_outline } from 'react-icons-kit/md/ic_hourglass_disabled_outline';
import { ic_hourglass_empty_outline } from 'react-icons-kit/md/ic_hourglass_empty_outline';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { bitcoin } from 'react-icons-kit/fa/bitcoin';
import { ic_hourglass_top_outline } from 'react-icons-kit/md/ic_hourglass_top_outline';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { SingleStep, StepByStep, WalletData } from '../../components/StepByStep';
import { ErrorAlert } from '../../components/ErrorAlert';
import { useWithAwait } from '../../utils/hooks/useWithAwait';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { BaseButton } from '../../components/BaseButton';
import { useCallback } from 'react';
import { SwapStepAlert } from '../components/SwapStepAlert';
import {useToBtcQuote} from "./useToBtcQuote";
import {SwapPageUIState} from "../../pages/useSwapPage";

/*
Steps lightning:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Lightning payment in-flight -> Lightning payment success

Steps on-chain:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Receiving BTC -> BTC received
3. Waiting BTC confirmations -> BTC confirmed
 */

export function ToBTCQuoteSummary2(props: {
  quote: IToBTCSwap;
  refreshQuote: () => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  autoContinue?: boolean;
  notEnoughForGas: bigint;
  balance?: bigint;
}) {

  const page = useToBtcQuote(props.quote, props.UICallback, props.type, props.balance);

  const stepByStep = page.executionSteps ? <StepByStep
    quote={props.quote}
    steps={page.executionSteps}
  /> : '';

  if(page.step1init) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step1init.additionalGasRequired}
            type="danger"
            icon={ic_error_outline_outline}
            title={`Not enough ${page.step1init.additionalGasRequired?.token.ticker} for fees`}
            description={`You need at least ${page.step1init.additionalGasRequired?.toString()} more to pay for fees and deposits!`}
          />

          <SwapStepAlert
            show={!!page.step1init.error}
            type="error"
            icon={ic_warning}
            title={page.step1init.error?.title}
            description={page.step1init.error?.error.message}
            error={page.step1init.error?.error}
            action={{
              type: 'button',
              text: 'Retry',
              onClick: props.refreshQuote,
              icon: <i className={'icon icon-refund'}></i>,
              variant: 'secondary',
            }}
          />
        </div>

        <ButtonWithWallet
          className="swap-panel__action"
          requiredWalletAddress={props.quote._getInitiator()}
          chainId={props.quote.chainIdentifier}
          onClick={page.step1init.init?.onClick}
          disabled={page.step1init.init?.disabled}
          size="lg"
        >
          {page.step1init.init?.loading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
          {page.step1init.init?.text}
        </ButtonWithWallet>
      </>
    )
  }

  if(page.step2paying) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}
        </div>

        {/*TODO: This should use the SwapStepAlert with the action button to retry!*/}
        <ErrorAlert className="mb-3" title={page.step2paying.error?.title} error={page.step2paying.error?.error} />
        {page.step2paying.error ? (
          <Button onClick={page.step2paying.error?.retry} variant="secondary">
            Retry
          </Button>
        ) : ''}
      </>
    )
  }

  if(page.step3refund) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}
        </div>

        <SwapStepAlert
          type="danger"
          icon={ic_error_outline_outline}
          title="Swap failed"
          description="Swap failed, you can refund your prior deposit"
          actionElement={
            <ButtonWithWallet
              className="swap-step-alert__button"
              requiredWalletAddress={props.quote._getInitiator()}
              chainId={props.quote.chainIdentifier}
              onClick={page.step3refund.refund?.onClick}
              disabled={page.step3refund.refund?.disabled}
              variant="secondary"
            >
              <div className="base-button__icon">
                {page.step3refund.refund?.loading ? (
                  <Spinner animation="border" size="sm" className="mr-2" />
                ) : (
                  <i className={'icon icon-refund'}></i>
                )}
              </div>
              Refund
            </ButtonWithWallet>
          }
        />

        <ErrorAlert className="mb-3" title={page.step3refund.error?.title} error={page.step3refund.error?.error} />
      </>
    );
  }

  if(page.step4) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}
        </div>

        <SwapStepAlert
          show={page.step4.state==="refunded"}
          type="info"
          icon={ic_settings_backup_restore_outline}
          title="Funds returning"
          description="Funds refunded successfully!"
        />

        <SwapStepAlert
          show={page.step4.state==="success"}
          type="success"
          icon={ic_check_circle}
          title="Swap success"
          description="Your swap was executed successfully!"
          action={
            props.quote.getType() === SwapType.TO_BTC
              ? {
                type: 'link',
                text: 'View transaction',
                href: FEConstants.btcBlockExplorer + props.quote.getOutputTxId(),
              }
              : undefined
          }
        />

        <BaseButton onClick={props.refreshQuote} variant="secondary" className="swap-panel__action">
          New quote
        </BaseButton>
      </>
    )
  }
}
