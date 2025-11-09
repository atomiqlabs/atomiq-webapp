import {
  ISwap,
  Token,
  ToBTCSwapState,
  FromBTCSwapState,
  SwapType,
  FromBTCLNSwapState, SpvFromBTCSwapState,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { Accordion, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useMemo } from 'react';
import { TokenIcon } from '../tokens/TokenIcon';
import { FeeDetails, useSwapFees } from './hooks/useSwapFees';
import { SwapExpiryProgressBar } from '../swaps/components/SwapExpiryProgressBar';
import { useSwapState } from '../swaps/hooks/useSwapState';
import { usePricing } from '../tokens/hooks/usePricing';

function FeePart(props: FeeDetails) {
  return (
    <div className={'d-flex font-medium ' + props.className}>
      <small className="d-flex align-items-center">
        {props.description == null ? (
          props.text
        ) : (
          <OverlayTrigger
            overlay={
              <Tooltip id={'fee-tooltip-desc-' + props.text}>
                <span>{props.description}</span>
              </Tooltip>
            }
          >
            <span className="dottedUnderline">{props.text}</span>
          </OverlayTrigger>
        )}
        {props.composition == null ? (
          ''
        ) : (
          <OverlayTrigger
            overlay={
              <Tooltip id={'fee-tooltip-' + props.text}>
                <span>
                  {(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1)}% +{' '}
                  {props.composition.base.amount} {props.composition.base.token.ticker}
                </span>
              </Tooltip>
            }
          >
            <Badge bg="primary" className="ms-1 pill-round px-2" pill>
              <span className="text-decoration-dotted">
                {(Math.round(props.composition.percentage.percentage * 10) / 10).toFixed(1)}%
              </span>
            </Badge>
          </OverlayTrigger>
        )}
      </small>
      <span className="ms-auto fw-bold d-flex align-items-center">
        <OverlayTrigger
          placement="left"
          overlay={
            <Tooltip id={'fee-tooltip-' + props.text} className="font-default">
              {props.fee.amountInDstToken == null ? (
                <span className="ms-auto d-flex align-items-center">
                  <TokenIcon
                    tokenOrTicker={props.fee.amountInSrcToken.token}
                    className="currency-icon-small"
                    style={{ marginTop: '-2px' }}
                  />
                  <span>
                    {props.fee.amountInSrcToken.amount} {props.fee.amountInSrcToken.token.ticker}
                  </span>
                </span>
              ) : (
                <span className="ms-auto text-end">
                  <span className="d-flex align-items-center justify-content-start">
                    <TokenIcon
                      tokenOrTicker={props.fee.amountInSrcToken.token}
                      className="currency-icon-small"
                      style={{ marginTop: '-1px' }}
                    />
                    <span>
                      {props.fee.amountInSrcToken.amount} {props.fee.amountInSrcToken.token.ticker}
                    </span>
                  </span>
                  <span className="d-flex align-items-center justify-content-center fw-bold">
                    =
                  </span>
                  <span className="d-flex align-items-center justify-content-start">
                    <TokenIcon
                      tokenOrTicker={props.fee.amountInDstToken.token}
                      className="currency-icon-small"
                    />
                    <span>
                      {props.fee.amountInDstToken.amount} {props.fee.amountInDstToken.token.ticker}
                    </span>
                  </span>
                </span>
              )}
            </Tooltip>
          }
        >
          <span className="text-decoration-dotted font-monospace">
            ${(props.usdValue == null ? 0 : props.usdValue).toFixed(2)}
          </span>
        </OverlayTrigger>
      </span>
    </div>
  );
}

export function SimpleFeeSummaryScreen(props: {
  swap: ISwap | null;
  btcFeeRate?: number;
  className?: string;
  onRefreshQuote?: () => void;
  inputToken?: Token;
  outputToken?: Token;
}) {
  const { fees: swapFees, totalUsdFee } = useSwapFees(props.swap, props.btcFeeRate);

  const fees = useMemo(() => {
    if (swapFees?.length > 0) return swapFees;
    if (!props.inputToken || !props.outputToken) return [];

    // Return default fees with 0 values when no swap
    const zeroSrcAmount = {
      token: props.inputToken,
      amount: '0',
      rawAmount: BigInt(0),
      _amount: BigInt(0),
      usdValue: async () => 0,
    };

    return [
      {
        text: 'Swap fee',
        fee: {
          amountInSrcToken: zeroSrcAmount,
          amountInDstToken: null,
          usdValue: async () => 0,
        },
        usdValue: 0,
      },
    ];
  }, [swapFees, props.inputToken, props.outputToken]);

  const inputToken: Token = props.swap?.getInput()?.token ?? props.inputToken;
  const outputToken: Token = props.swap?.getOutput()?.token ?? props.outputToken;

  const inputTokenUsdPrice = usePricing('1', inputToken);
  const outputTokenUsdPrice = usePricing('1', outputToken);

  const calculatedSwapPrice = useMemo(() => {
    if (!inputTokenUsdPrice || !outputTokenUsdPrice || inputTokenUsdPrice === 0) return null;
    return outputTokenUsdPrice / inputTokenUsdPrice;
  }, [inputTokenUsdPrice, outputTokenUsdPrice]);

  const { totalQuoteTime, quoteTimeRemaining, state } = useSwapState(props.swap);

  const isExpired = useMemo(
    () => props.swap?.isQuoteSoftExpired() || props.swap?.isQuoteExpired(),
    [state]
  );

  return (
    <>
      <Accordion className="simple-fee-screen">
        <Accordion.Item eventKey="0" className="tab-accent-nop">
          <Accordion.Header className="font-bigger d-flex flex-row" bsPrefix="fee-accordion-header">
            <div className="simple-fee-screen__quote">
              <div className="sc-text">
                {isExpired ? (
                  <span className="simple-fee-screen__quote__error">
                    <span className="icon icon-invalid-error"></span>
                    <span className="sc-text">Quote expired</span>
                  </span>
                ) : !outputToken || !inputToken ? (
                  <div className="simple-fee-screen__skeleton"></div>
                ) : !props.swap ? (
                  <>
                    1 {outputToken.ticker} ={' '}
                    {calculatedSwapPrice != null
                      ? calculatedSwapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals)
                      : '-'}{' '}
                    {inputToken.ticker}
                  </>
                ) : (
                  <>
                    1 {outputToken.ticker} ={' '}
                    {props.swap
                      .getPriceInfo()
                      .swapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals)}{' '}
                    {inputToken.ticker}
                  </>
                )}
              </div>
              <SwapExpiryProgressBar
                expired={isExpired}
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={true}
                expiryText="Quote expired!"
                onRefreshQuote={props.onRefreshQuote}
              />
            </div>
            <div className="icon icon-receipt-fees"></div>
            <span className="simple-fee-screen__fee">
              {totalUsdFee == null ? (
                props.swap == null ? (
                  '$0.00'
                ) : (
                  <div className="simple-fee-screen__skeleton"></div>
                )
              ) : (
                '$' + totalUsdFee.toFixed(2)
              )}
            </span>
            <div className="icon icon-caret-down"></div>
          </Accordion.Header>
          <Accordion.Body className="simple-fee-screen__body">
            {fees.map((e, index) => (
              <FeePart key={index} {...e} />
            ))}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
