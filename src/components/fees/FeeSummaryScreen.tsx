import {
  ISwap,
  PercentagePPM,
  SwapDirection,
  toHumanReadableString,
  Token,
  TokenAmount,
} from '@atomiqlabs/sdk';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as React from 'react';
import { TokenIcon } from '../tokens/TokenIcon';
import { useSwapFees } from '../../hooks/fees/useSwapFees';

function FeePart(props: {
  text: string;
  isApproximate?: boolean;

  amount: bigint;
  token: Token;

  className?: string;

  composition?: {
    percentage: PercentagePPM;
    base: TokenAmount;
  };

  description?: string;
}) {
  return (
    <div className="d-flex my-2">
      <span className="d-flex align-items-center">
        {props.text}
        {props.composition == null ? (
          ''
        ) : props.composition.base == null ? (
          <Badge bg="primary" className="ms-1 pill-round px-2" pill>
            {props.composition.percentage.percentage} %
          </Badge>
        ) : (
          <OverlayTrigger
            overlay={
              <Tooltip id={'fee-tooltip-' + props.text}>
                <span>
                  {props.composition.percentage.percentage}% + {props.composition.base.amount}{' '}
                  {props.composition.base.token.ticker}
                </span>
              </Tooltip>
            }
          >
            <Badge bg="primary" className="ms-1 pill-round px-2" pill>
              <span className="dottedUnderline">{props.composition.percentage.percentage}%</span>
            </Badge>
          </OverlayTrigger>
        )}
        {props.description != null ? (
          <OverlayTrigger
            overlay={
              <Tooltip id={'fee-tooltip-desc-' + props.text}>
                <span>{props.description}</span>
              </Tooltip>
            }
          >
            <Badge bg="primary" className="ms-1 pill-round px-2" pill>
              <span className="dottedUnderline">?</span>
            </Badge>
          </OverlayTrigger>
        ) : (
          ''
        )}
      </span>
      <span className="ms-auto">
        {props.isApproximate ? '~' : ''}
        {toHumanReadableString(props.amount, props.token)} {props.token.ticker}
      </span>
    </div>
  );
}

export function FeeSummaryScreen(props: { swap: ISwap; className?: string }) {
  let className: string = props.className;

  let amount: bigint;
  let total: bigint;
  let token: Token;
  if (props.swap.getDirection() === SwapDirection.TO_BTC) {
    amount = props.swap.getInputWithoutFee().rawAmount;
    total = props.swap.getInput().rawAmount;
    token = props.swap.getInput().token;
  } else {
    total = props.swap.getOutput().rawAmount;
    amount = total + props.swap.getFee().amountInDstToken.rawAmount;
    token = props.swap.getOutput().token;
  }

  const { fees } = useSwapFees(props.swap, undefined, false);

  if (props.swap == null) return null;

  return (
    <div className={className}>
      <FeePart text="Amount" amount={amount} token={token} />

      {fees.map((val) => {
        if (val.fee.amountInDstToken == null || val.fee.amountInSrcToken.token === token) {
          return (
            <FeePart
              text={val.text}
              description={val.description}
              amount={val.fee.amountInSrcToken.rawAmount}
              token={val.fee.amountInSrcToken.token}
              composition={val.composition}
            />
          );
        } else if (val.fee.amountInDstToken.token === token) {
          return (
            <FeePart
              text={val.text}
              description={val.description}
              amount={val.fee.amountInDstToken.rawAmount}
              token={val.fee.amountInDstToken.token}
              composition={val.composition}
            />
          );
        }
      })}

      <div className="d-flex fw-bold border-top border-light font-bigger">
        <span>Total:</span>
        <span className="ms-auto d-flex align-items-center">
          <TokenIcon tokenOrTicker={token} className="currency-icon-small" />
          {toHumanReadableString(total, token)} {token.ticker}
        </span>
      </div>
    </div>
  );
}
