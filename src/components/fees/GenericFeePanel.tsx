import {
  ISwap,
  Token,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { Accordion, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useMemo } from 'react';
import { TokenIcon } from '../tokens/TokenIcon';
import { FeeDetails, useSwapFees } from '../../hooks/fees/useSwapFees';
import { usePricing } from '../../hooks/pricing/usePricing';
import {SwapExpiryProgressCircle} from "../swaps/SwapExpiryProgressCircle";
import {useSwapState} from "../../hooks/swaps/helpers/useSwapState";
import {FEConstants} from "../../FEConstants";

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
            {FEConstants.USDollar.format(props.usdValue == null ? 0 : props.usdValue)}
          </span>
        </OverlayTrigger>
      </span>
    </div>
  );
}

export function GenericFeePanel(props: {
  fees: FeeDetails[];
  isExpired?: boolean;
  inputToken?: Token;
  outputToken?: Token;
  price?: number;
  totalUsdFee?: number;
  totalTime?: number;
  remainingTime?: number;
  onRefreshQuote?: () => void;
}) {
  return (
    <>
      <Accordion className="simple-fee-screen">
        <Accordion.Item eventKey="0" className="tab-accent-nop">
          <Accordion.Header className="font-bigger d-flex flex-row" bsPrefix="fee-accordion-header">
            <div className="simple-fee-screen__quote">
              <div className="sc-text">
                {props.isExpired ? (
                  <span className="simple-fee-screen__quote__error">
                    <span className="icon icon-invalid-error"></span>
                    <span className="sc-text">Quote expired</span>
                  </span>
                ) : !props.outputToken || !props.outputToken ? (
                  <div className="simple-fee-screen__skeleton"></div>
                ) : (
                  <>
                    1 {props.outputToken.ticker} ={' '}
                    {props.price?.toFixed(props.inputToken.displayDecimals ?? props.inputToken.decimals)
                      ?? '-'}{' '}
                    {props.inputToken.ticker}
                  </>
                )}
              </div>
              <SwapExpiryProgressCircle
                expired={props.isExpired}
                timeRemaining={props.remainingTime}
                totalTime={props.totalTime}
                show={props.isExpired || (props.totalTime != null && props.remainingTime != null)}
                onRefreshQuote={props.onRefreshQuote}
              />
            </div>
            <div className="icon icon-receipt-fees"></div>
            <span className="simple-fee-screen__fee">
              {props.totalUsdFee == null ? '$0.00' : FEConstants.USDollar.format(props.totalUsdFee)}
            </span>
            <div className="icon icon-caret-down"></div>
          </Accordion.Header>
          <Accordion.Body className="simple-fee-screen__body">
            {props.fees.map((e, index) => (
              <FeePart key={index} {...e} />
            ))}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
