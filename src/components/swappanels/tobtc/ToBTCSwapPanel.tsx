import * as React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { ISwap, IToBTCSwap, SwapType } from '@atomiqlabs/sdk';

import { ic_settings_backup_restore_outline } from 'react-icons-kit/md/ic_settings_backup_restore_outline';
import { ic_error_outline_outline } from 'react-icons-kit/md/ic_error_outline_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useToBtcQuote } from '../../../hooks/swaps/useToBtcQuote';
import { StepByStep } from '../../swaps/StepByStep';
import { SwapStepAlert } from '../../swaps/SwapStepAlert';
import { SwapPageUIState } from '../../../hooks/pages/useSwapPage';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { BaseButton } from '../../common/BaseButton';
import { FEConstants } from '../../../FEConstants';
import { SwapFeePanel } from '../../fees/SwapFeePanel';
import {ChainsConfig} from "../../../data/ChainsConfig";

/*
Steps lightning:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Lightning payment in-flight -> Lightning payment success

Steps on-chain:
1. Sending <chain> transaction -> <chain> transaction confirmed
2. Receiving BTC -> BTC received
3. Waiting BTC confirmations -> BTC confirmed
 */

export function ToBTCSwapPanel(props: {
  quote: IToBTCSwap;
  refreshQuote: (clearAddress?: boolean) => void;
  UICallback: (quote: ISwap, state: SwapPageUIState) => void;
  type?: 'payment' | 'swap';
  autoContinue?: boolean;
  notEnoughForGas: bigint;
  balance?: bigint;
}) {
  const page = useToBtcQuote(props.quote, props.UICallback, props.type, props.balance);

  const stepByStep = page.executionSteps ? (
    <StepByStep quote={props.quote} steps={page.executionSteps} />
  ) : (
    ''
  );

  const swapFees = (
    <div className="mt-3">
      <SwapFeePanel
        swap={props.quote}
        isExpired={page.step4?.state === 'expired'}
        onRefreshQuote={props.refreshQuote}
        totalTime={page.step1init?.expiry.total}
        remainingTime={page.step1init?.expiry.remaining}
      />
    </div>
  );

  if (page.step1init) {
    return (
      <>
        {swapFees}

        <SwapStepAlert
          show={!!page.step1init.additionalGasRequired}
          type="danger"
          icon={ic_error_outline_outline}
          title={`Not enough ${page.step1init.additionalGasRequired?.token.ticker} for network fees`}
          description={`You need at least ${page.step1init.additionalGasRequired?.toString()} more in your wallet to cover the cost of network gas fees and deposits! Deposit more ${page.step1init.additionalGasRequired?.token?.ticker} to your wallet and retry.`}
        />

        <SwapStepAlert
          show={!!page.step1init.error}
          type="error"
          icon={ic_warning}
          title={page.step1init.error?.title}
          error={page.step1init.error?.error}
        />

        <ButtonWithWallet
          className="swap-panel__action"
          requiredWalletAddress={props.quote._getInitiator()}
          chainId={props.quote.chainIdentifier}
          onClick={page.step1init.init?.onClick}
          disabled={page.step1init.init?.disabled}
          size="lg"
        >
          {page.step1init.init?.loading ? (
            <Spinner animation="border" size="sm" className="mr-2" />
          ) : (
            ''
          )}
          {page.step1init.init?.text}
        </ButtonWithWallet>
      </>
    );
  }

  if (page.step2paying) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step2paying.error}
            type="warning"
            title={page.step2paying.error?.title}
            error={page.step2paying.error?.error}
            actionElement={
              page.step2paying.error?.retry && (
                <BaseButton
                  className="swap-step-alert__button"
                  onClick={page.step2paying.error?.retry}
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

  if (page.step3refund) {
    return (
      <>
        <div className="swap-panel__card">
          {stepByStep}

          <SwapStepAlert
            show={!!page.step3refund.error}
            type="error"
            icon={ic_warning}
            title={page.step3refund.error?.title}
            error={page.step3refund.error?.error}
          />

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
        </div>
      </>
    );
  }

  if (page.step4) {
    return (
      <>
        {page.step4.state === 'expired' && swapFees}

        <div className="swap-panel__card">
          {page.step4.state !== 'expired' && stepByStep}

          <SwapStepAlert
            show={page.step4.state === 'refunded'}
            type="info"
            icon={ic_settings_backup_restore_outline}
            title="Funds returning"
            description="Funds refunded successfully!"
          />

          <SwapStepAlert
            show={page.step4.state === 'success'}
            type="success"
            icon={ic_check_circle}
            title="Swap success"
            description="Your swap was executed successfully!"
            action={
              props.quote.getType() === SwapType.TO_BTC
                ? {
                    type: 'link',
                    text: 'View transaction',
                    href: ChainsConfig.BITCOIN.blockExplorer + props.quote.getOutputTxId(),
                  }
                : undefined
            }
          />
        </div>

        {page.step4.showConnectWalletButton
          ? <ButtonWithWallet
            className="swap-panel__action"
            chainId={props.quote.chainIdentifier}
          />
          : <BaseButton onClick={() => props.refreshQuote(page.step4.clearAddressOnRefresh)} variant="primary" className="swap-panel__action">
            New Swap
          </BaseButton>
        }
      </>
    );
  }
}
