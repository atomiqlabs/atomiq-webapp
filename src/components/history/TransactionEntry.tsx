import { IFromBTCSwap, isSCToken, ISwap, IToBTCSwap, SwapDirection } from '@atomiqlabs/sdk';
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Button, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import { useChain } from '../../hooks/chains/useChain';
import { TransactionToken } from './TransactionToken';
import { TextPill } from '../common/TextPill';
import { BaseButton } from '../common/BaseButton';

export function TransactionEntry(props: { swap: ISwap }) {
  const navigate = useNavigate();

  const input = props.swap.getInput();
  const output = props.swap.getOutput();

  const inputExplorer = isSCToken(input.token)
    ? FEConstants.blockExplorers[input.token.chainId]
    : !input.token.lightning
      ? FEConstants.btcBlockExplorer
      : null;
  const outputExplorer = isSCToken(output.token)
    ? FEConstants.blockExplorers[output.token.chainId]
    : !output.token.lightning
      ? FEConstants.btcBlockExplorer
      : null;

  const txIdInput = props.swap.getInputTxId();
  const txIdOutput = props.swap.getOutputTxId();

  // Get input address - for TO_BTC it's the smart chain address, for FROM_BTC it's the Bitcoin sender address
  const inputAddress = props.swap._getInitiator ? props.swap._getInitiator() : '';
  const outputAddress = props.swap.getOutputAddress(); // Destination address for both swap types

  const refundable =
    props.swap.getDirection() === SwapDirection.TO_BTC && (props.swap as IToBTCSwap).isRefundable();
  const claimable =
    props.swap.getDirection() === SwapDirection.FROM_BTC &&
    (props.swap as IFromBTCSwap).isClaimable();

  const inputUsdValue = usePricing(input.amount, input.token);
  const outputUsdValue = usePricing(output.amount, output.token);

  const inputChain = useChain(input.token);
  const outputChain = useChain(output.token);

  const navigateToSwap = (event) => {
    if (event) {
      event.preventDefault();
    }
    navigate('/?swapId=' + props.swap.getId());
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

  const requiresAction = props.swap.requiresAction();
  const isPending =
    !props.swap.isSuccessful() &&
    !props.swap.isFailed() &&
    !props.swap.isQuoteSoftExpired() &&
    !refundable &&
    !claimable;

  const badge = props.swap.isSuccessful() ? (
    <TextPill variant="success">Success</TextPill>
  ) : props.swap.isFailed() ? (
    <TextPill variant="danger">Failed</TextPill>
  ) : props.swap.isQuoteSoftExpired() ? (
    <TextPill variant="danger">Quote expired</TextPill>
  ) : refundable ? (
    <TextPill variant="warning">Refundable</TextPill>
  ) : claimable ? (
    <TextPill variant="warning">Claimable</TextPill>
  ) : requiresAction && isPending ? (
    <TextPill variant="warning">Awaiting payment</TextPill>
  ) : (
    <TextPill variant="warning">Pending</TextPill>
  );
  return (
    <Row className="transaction-entry is-clickable gx-1 gy-1" onClick={navigateToSwap}>
      {props.swap.requiresAction() && <span className="transaction-entry__alert"></span>}
      <Col md={4} sm={12} className="is-token">
        <TransactionToken
          token={input.token}
          amount={input.amount}
          address={inputAddress}
          label="from"
          explorer={inputExplorer}
          txId={txIdInput}
        />
        <div className="is-arrow">
          <i className="icon icon-arrow-right"></i>
        </div>
      </Col>
      <Col md={3} sm={12} className="is-token">
        <TransactionToken
          token={output.token}
          amount={output.amount}
          address={outputAddress}
          label="to"
          explorer={outputExplorer}
          txId={txIdOutput}
        />
      </Col>
      <Col md={1} sm={2} className="is-value is-right">
        <div>{outputUsdValue != null ? FEConstants.USDollar.format(outputUsdValue) : '-'}</div>
      </Col>
      <Col md={2} sm={6} xs={8} className="d-flex text-end flex-column is-date is-right">
        <div className="sc-date">{formatDate(props.swap.createdAt)}</div>
        <div className="sc-time">{formatTime(props.swap.createdAt)}</div>
      </Col>
      <Col md={2} sm={4} xs={4} className="d-flex text-end flex-column is-status">
        {requiresAction ? (
          <BaseButton
            variant="secondary"
            className="width-fill"
            customIcon={refundable ? 'refund' : claimable || isPending ? 'claim' : null}
            onClick={() => navigateToSwap(null)}
          >
            {refundable ? 'Refund' : claimable ? 'Claim' : isPending ? 'Pay' : 'View'}
          </BaseButton>
        ) : (
          badge
        )}
      </Col>
    </Row>
  );
}
