import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import { TransactionToken } from './TransactionToken';
import { TextPill } from '../common/TextPill';
import { BaseButton } from '../common/BaseButton';
import { TransactionEntryProps } from '../../adapters/transactionAdapters';
import { useCallback } from 'react';
import classNames from 'classnames';

export function TransactionEntry(props: TransactionEntryProps) {
  const navigate = useNavigate();

  const usdValueHook = usePricing(props.outputAmount, !props.usdValue ? props.outputToken : undefined);
  const usdValue = !!props.usdValue
    ? FEConstants.USDollar.format(props.usdValue)
    : usdValueHook != null
      ? FEConstants.USDollar.format(usdValueHook)
      : null;

  const navigateToSwap = useCallback(
    (event) => {
      if (event) {
        event.preventDefault();
      }
      if (props.id == null) return;
      navigate('/?swapId=' + props.id);
    },
    [props.id]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
  };

  const isPending =
    !props.isSuccessful &&
    !props.isFailed &&
    !props.isQuoteSoftExpired &&
    !props.refundable &&
    !props.claimable;

  const badge = props.isSuccessful ? (
    <TextPill variant="success">Success</TextPill>
  ) : props.isFailed ? (
    <TextPill variant="danger">Failed</TextPill>
  ) : props.isQuoteSoftExpired ? (
    <TextPill variant="danger">Quote expired</TextPill>
  ) : props.refundable ? (
    <TextPill variant="warning">Refundable</TextPill>
  ) : props.claimable ? (
    <TextPill variant="warning">Claimable</TextPill>
  ) : props.requiresAction && isPending ? (
    <TextPill variant="warning">Awaiting payment</TextPill>
  ) : (
    <TextPill variant="warning">Pending</TextPill>
  );

  return (
    <Row
      className={classNames('transaction-entry', 'gx-1', 'gy-1', {
        'is-clickable': props.id != null,
      })}
      onClick={navigateToSwap}
    >
      {props.requiresAction && <span className="transaction-entry__alert"></span>}
      <Col lg={3} xs={5} className="is-token">
        <TransactionToken
          token={props.inputToken}
          amount={props.inputAmount}
          address={props.inputAddress}
          label="from"
          explorer={props.inputExplorer}
          txId={props.inputTxId}
        />
      </Col>
      <Col lg={1} xs={2} className="is-arrow">
        <i className="icon icon-arrow-right"></i>
      </Col>
      <Col lg={3} xs={5} className="is-token">
      <TransactionToken
          token={props.outputToken}
          amount={props.outputAmount}
          address={props.outputAddress}
          label="to"
          explorer={props.outputExplorer}
          txId={props.outputTxId}
        />
      </Col>
      <Col lg={1} sm={2} className="is-value is-right">
        <span className="sc-mobile-label">Value</span>
        <div>{usdValue != null ? usdValue : '-'}</div>
      </Col>
      <Col lg={2} sm={12} className="d-flex text-end is-date is-right">
        <span className="sc-mobile-label">Date</span>
        <div className="sc-date">
          {formatDate(props.createdAt)}
          <span className="d-inline d-sm-hidden">,</span>
        </div>
        <div className="sc-time">{formatTime(props.createdAt)}</div>
      </Col>
      <Col lg={2} sm={12} className="d-flex text-end is-status">
        {props.requiresAction ? (
          <BaseButton
            variant="secondary"
            className="width-fill"
            customIcon={props.refundable ? 'refund' : props.claimable || isPending ? 'claim' : null}
            onClick={() => navigateToSwap(null)}
          >
            {props.refundable ? 'Refund' : props.claimable ? 'Claim' : isPending ? 'Pay' : 'View'}
          </BaseButton>
        ) : (
          <>
            <span className="sc-mobile-label">Status</span>
            {badge}
          </>
        )}
      </Col>
    </Row>
  );
}
