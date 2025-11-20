import { SwapDirection } from '@atomiqlabs/sdk';
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Button, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import { useChain } from '../../hooks/chains/useChain';
import { TransactionToken } from './TransactionToken';
import { TextPill } from '../common/TextPill';
import { BaseButton } from '../common/BaseButton';
import { TransactionEntryProps } from '../../adapters/transactionAdapters';

export function TransactionEntry(props: TransactionEntryProps) {
  const navigate = useNavigate();

  const inputUsdValue = usePricing(props.inputAmount, props.inputToken);
  const outputUsdValue = usePricing(props.outputAmount, props.outputToken);

  const inputChain = useChain(props.inputToken);
  const outputChain = useChain(props.outputToken);

  const navigateToSwap = (event) => {
    if (event) {
      event.preventDefault();
    }
    navigate('/?swapId=' + props.id);
  };

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
    <Row className="transaction-entry is-clickable gx-1 gy-1" onClick={navigateToSwap}>
      {props.requiresAction && <span className="transaction-entry__alert"></span>}
      <Col md={4} sm={12} className="is-token">
        <TransactionToken
          token={props.inputToken}
          amount={props.inputAmount}
          address={props.inputAddress}
          label="from"
          explorer={props.inputExplorer}
          txId={props.inputTxId}
        />
        <div className="is-arrow">
          <i className="icon icon-arrow-right"></i>
        </div>
      </Col>
      <Col md={3} sm={12} className="is-token">
        <TransactionToken
          token={props.outputToken}
          amount={props.outputAmount}
          address={props.outputAddress}
          label="to"
          explorer={props.outputExplorer}
          txId={props.outputTxId}
        />
      </Col>
      <Col md={1} sm={2} className="is-value is-right">
        <div>{outputUsdValue != null ? FEConstants.USDollar.format(outputUsdValue) : '-'}</div>
      </Col>
      <Col md={2} sm={6} xs={8} className="d-flex text-end flex-column is-date is-right">
        <div className="sc-date">{formatDate(props.createdAt)}</div>
        <div className="sc-time">{formatTime(props.createdAt)}</div>
      </Col>
      <Col md={2} sm={4} xs={4} className="d-flex text-end flex-column is-status">
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
          badge
        )}
      </Col>
    </Row>
  );
}
