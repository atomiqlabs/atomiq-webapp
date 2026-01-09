import * as React from 'react';
import { useState } from 'react';
import ValidatedInput from '../components/ValidatedInput';
import { Alert, Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { TokensDropdown } from '../components/tokens/TokensDropdown';
import { SwapStepAlert } from '../components/swaps/SwapStepAlert';
import { WalletInfoBadge } from '../components/wallets/WalletInfoBadge';
import { AuditedBy } from '../components/_deprecated/AuditedBy';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { useSwapPage } from '../hooks/pages/useSwapPage';
import { BaseButton } from '../components/common/BaseButton';
import { QRScannerModal } from '../components/qrscanner/QRScannerModal';
import { SwapPanel } from '../components/swappanels/SwapPanel';
import { PlaceholderFeePanel } from '../components/fees/PlaceholderFeePanel';
import { SwapFeePanel } from '../components/fees/SwapFeePanel';

export function SwapNew() {
  const swapPage = useSwapPage();

  const [reversed, setReversed] = useState(false);
  const [qrScanning, setQrScanning] = useState<boolean>(false);

  return (
    <>
      <QRScannerModal
        onScanned={(data: string) => {
          swapPage.output.address?.onChange(data);
          setQrScanning(false);
        }}
        show={qrScanning}
        onHide={() => setQrScanning(false)}
      />

      <div className="swap-panel">
        {/*TODO: We need a better way to show the error when quoting*/}
        <SwapStepAlert
          type="error"
          icon={ic_warning}
          title="Quote error"
          description={
            swapPage.quote.error?.message ?? 'An error occurred while fetching the quote'
          }
          error={swapPage.quote.error}
          show={swapPage.quote.error != null}
          className="swap-panel__error mb-4"
          action={{
            type: 'button',
            text: 'Retry',
            onClick: swapPage.quote.refresh,
            variant: 'secondary',
          }}
        />
        {swapPage.hideUI ? null : (
          <>
            <div className="swap-panel__card">
              <div className="swap-panel__card__header">
                <div className="swap-panel__card__title">You pay</div>

                {swapPage.input.wallet?.spendable != null ? (
                  <div className="swap-connected-wallet">
                    <div className="swap-panel__card__wallet">
                      <WalletInfoBadge
                        noText={false}
                        simple={true}
                        setMax={() =>
                          swapPage.input.amount.onChange(swapPage.input.wallet.spendable.amount)
                        }
                        currency={swapPage.input.token.value}
                        variantButton="clear"
                        maxSpendable={swapPage.input.wallet?.spendable}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="swap-panel__card__wallet">
                    <WalletInfoBadge
                      noText={false}
                      simple={true}
                      currency={swapPage.input.token.value}
                      variantButton="clear"
                    />
                  </div>
                )}
              </div>
              <div className="swap-panel__card__body">
                <TokensDropdown
                  tokensList={swapPage.input.token.values}
                  onSelect={
                    swapPage.input.token.disabled ? undefined : swapPage.input.token.onChange
                  }
                  value={swapPage.input.token.value}
                  className="round-right text-white bg-black bg-opacity-10"
                />
                <ValidatedInput
                  disabled={swapPage.input.amount.disabled}
                  className="swap-panel__input-wrapper"
                  placeholder={'0.00'}
                  type="number"
                  value={swapPage.input.amount.value}
                  size={'lg'}
                  textStart={
                    swapPage.input.amount.loading ? <Spinner className="text-white" /> : null
                  }
                  onChange={swapPage.input.amount.onChange}
                  inputId="amount-input"
                  inputClassName="swap-panel__input"
                  floatingLabelClassName="swap-panel__label"
                  floatingLabel={swapPage.input.amount.valueUsd}
                  expectingFloatingLabel={true}
                  step={swapPage.input.amount.step}
                  min={swapPage.input.amount.min}
                  max={swapPage.input.amount.max}
                  feedbackEndElement={
                    swapPage.input.useExternalWallet ? (
                      <a
                        className="use-external"
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          swapPage.input.useExternalWallet();
                        }}
                      >
                        Use external wallet
                      </a>
                    ) : null
                  }
                  validated={
                    swapPage.input.amount.validation?.status === 'error'
                      ? swapPage.input.amount.validation.text
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="swap-panel__toggle">
              <Button
                onClick={() => {
                  if (swapPage.input.token.disabled || swapPage.output.token.disabled) return;
                  setReversed((v) => !v);
                  swapPage.changeDirection();
                }}
                size="lg"
                className="swap-panel__toggle__button"
                style={{
                  transition: 'transform 0.35s ease',
                  transform: reversed ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <div className="icon icon-swap"></div>
              </Button>
            </div>
            <div className="swap-panel__group">
              <div className="swap-panel__card">
                <div className="swap-panel__card__header">
                  <div className="swap-panel__card__title">You receive</div>
                  <div className="swap-panel__card__wallet">
                    <WalletInfoBadge
                      noText={false}
                      simple={true}
                      currency={swapPage.output.token.value}
                      variantButton="clear"
                      maxSpendable={swapPage.output.wallet?.balance}
                    />
                  </div>
                </div>
                <div className="swap-panel__card__body">
                  <TokensDropdown
                    tokensList={swapPage.output.token.values}
                    onSelect={
                      swapPage.output.token.disabled ? undefined : swapPage.output.token.onChange
                    }
                    value={swapPage.output.token.value}
                    className="round-right text-white bg-black bg-opacity-10"
                  />
                  <ValidatedInput
                    disabled={swapPage.output.amount.disabled}
                    className="swap-panel__input-wrapper"
                    type="number"
                    value={swapPage.output.amount.value}
                    size={'lg'}
                    textStart={
                      swapPage.output.amount.loading ? <Spinner className="text-white" /> : null
                    }
                    onChange={swapPage.output.amount.onChange}
                    inputId="amount-output"
                    inputClassName="swap-panel__input"
                    floatingLabelClassName="swap-panel__label"
                    placeholder={'0.00'}
                    floatingLabel={swapPage.output.amount.valueUsd}
                    expectingFloatingLabel={true}
                    step={swapPage.output.amount.step}
                    min={swapPage.output.amount.min}
                    max={swapPage.output.amount.max}
                    validated={
                      swapPage.output.amount.validation?.status === 'error'
                        ? swapPage.output.amount.validation.text
                        : undefined
                    }
                  />
                </div>
                <div className={swapPage.output.gasDrop != null ? 'd-flex' : 'd-none'}>
                  <ValidatedInput
                    type={'checkbox'}
                    className="swap-panel__input-wrapper is-checkbox"
                    onChange={swapPage.output.gasDrop?.onChange}
                    placeholder={
                      <span>
                        <OverlayTrigger
                          overlay={
                            <Tooltip id={'fee-tooltip-gas-drop'}>
                              <span>
                                Swap some amount of BTC to{' '}
                                {swapPage.output.gasDrop?.amount.token.ticker} (gas token on the
                                destination chain), so that you can transact on{' '}
                                {swapPage.output.gasDrop?.amount.token.chainId}
                              </span>
                            </Tooltip>
                          }
                        >
                          <span className="dottedUnderline">
                            Request gas drop of{' '}
                            {swapPage.output.gasDrop?.amount._amount.toString(10)}{' '}
                            {swapPage.output.gasDrop?.amount.token.ticker}
                          </span>
                        </OverlayTrigger>
                      </span>
                    }
                    value={swapPage.output.gasDrop?.checked}
                    onValidate={() => null}
                    disabled={swapPage.output.gasDrop?.disabled}
                  />
                </div>
              </div>

              <div
                className={'swap-panel__card ' + (!swapPage.output.address ? 'd-none' : 'd-flex')}
              >
                <div className="swap-panel__card__body">
                  <div className="wallet-address">
                    {swapPage.output.webln?.fetchInvoice ? (
                      <div className="wallet-address__body">
                        <a
                          href="#"
                          className="wallet-address__invoice-button"
                          onClick={swapPage.output.webln.fetchInvoice}
                        >
                          <i className="icon icon-Lightning-invoice"></i>
                          <span className="sc-text">Fetch invoice from WebLN</span>
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="wallet-address__body">
                          <div className="wallet-address__title">
                            {swapPage.output.chainId ?? 'Wallet'} Destination Address
                          </div>
                          <ValidatedInput
                            type={'text'}
                            className={'wallet-address__form with-inline-icon'}
                            onChange={swapPage.output.address?.onChange}
                            value={swapPage.output.address?.value}
                            placeholder={swapPage.output.address?.placeholder}
                            validated={
                              swapPage.output.address?.validation?.status === 'error'
                                ? swapPage.output.address?.validation.text
                                : null
                            }
                            disabled={swapPage.output.address?.disabled}
                            textEnd={
                              swapPage.output.address?.loading ? (
                                <Spinner className="text-white" />
                              ) : swapPage.output.address?.value==='' ?
                                  null
                              : swapPage.output.address?.validation?.status === 'success' ? (
                                <span className="icon icon-check"></span>
                              ) : swapPage.output.address?.validation?.status === 'error' ? (
                                <span className="icon icon-invalid-error"></span>
                              ) : swapPage.output.address?.validation?.status === 'warning' ? (
                                <span className="icon icon-info"></span>
                              ) : null
                            }
                            successFeedback={
                              swapPage.output.address?.validation?.status === 'success'
                                ? swapPage.output.address?.validation.text
                                : null
                            }
                            dynamicTextEndPosition={true}
                          />
                          {swapPage.output.address?.validation?.status === 'warning' ? (
                            <div className="wallet-address__feedback is-warning">
                              {swapPage.output.address.validation.text}
                            </div>
                          ) : (
                            ''
                          )}
                        </div>

                        <div className="wallet-address__action">
                          {swapPage.output.wallet != null ? (
                            <OverlayTrigger
                              placement="top"
                              overlay={
                                <Tooltip id="scan-qr-tooltip">
                                  Disconnect wallet & use external wallet
                                </Tooltip>
                              }
                            >
                              <a
                                href="#"
                                className="wallet-address__action__button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  swapPage.output.wallet.disconnect();
                                }}
                              >
                                <span className="icon icon-disconnect"></span>
                              </a>
                            </OverlayTrigger>
                          ) : (
                            <OverlayTrigger
                              placement="top"
                              overlay={<Tooltip id="scan-qr-tooltip">Scan QR code</Tooltip>}
                            >
                              <a
                                href="#"
                                className="wallet-address__action__button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setQrScanning(true);
                                }}
                              >
                                <span className="icon icon-qr-scan"></span>
                              </a>
                            </OverlayTrigger>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {swapPage.quote.quote != null &&
        (!swapPage.quote.isRandom || swapPage.swapTypeData.requiresOutputWallet) ? (
          <div className="d-flex flex-column text-white">
            <SwapPanel
              type="swap"
              quote={swapPage.quote.quote}
              balance={swapPage.input.wallet?.spendable?.rawAmount}
              refreshQuote={swapPage.quote.refresh}
              UICallback={swapPage.quote.UICallback}
              abortSwap={swapPage.quote.abort}
              feeRate={swapPage.input.wallet?.btcFeeRate}
            />
          </div>
        ) : (
          <>
            <div className="mt-3">
              {swapPage.quote.quote ? (
                <SwapFeePanel
                  swap={swapPage.quote.quote}
                  btcFeeRate={swapPage.input.wallet?.btcFeeRate}
                />
              ) : (
                <PlaceholderFeePanel
                  inputToken={swapPage.input.token.value}
                  outputToken={swapPage.output.token.value}
                />
              )}
            </div>
            <BaseButton variant="primary" className="swap-panel__action" disabled={true} size="lg">
              {swapPage.swapButtonHint}
            </BaseButton>
          </>
        )}
      </div>

      <AuditedBy chainId={swapPage.smartChainId} />
    </>
  );
}
