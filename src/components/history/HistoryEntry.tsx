import { IFromBTCSwap, isSCToken, ISwap, IToBTCSwap, SwapDirection } from '@atomiqlabs/sdk';
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Button, Col, Row } from 'react-bootstrap';
import * as React from 'react';
import { usePricing } from '../../hooks/pricing/usePricing';
import { useChain } from '../../hooks/chains/useChain';
import { HistoryToken } from './HistoryToken';
import { TextPill } from '../common/TextPill';

export function HistoryEntry(props: { swap: ISwap }) {
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

  const inputAddress =
    props.swap instanceof IToBTCSwap
      ? props.swap._getInitiator()
      : props.swap instanceof IFromBTCSwap
        ? props.swap._getInitiator()
        : '';
  const outputAddress = props.swap.getOutputAddress();

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
    event.preventDefault();
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
  ) : (
    <TextPill variant="warning">Pending</TextPill>
  );

  return (
    <Row
      className="history-entry d-flex flex-row gx-1 gy-1"
      onClick={navigateToSwap}
      style={{ cursor: 'pointer' }}
    >
      {/*<Col md={10} sm={12} className="d-flex">*/}
      {/*  <div className="card border-0 bg-transparent p-2 width-fill container-fluid">*/}
      {/*    <Row className="">*/}
      {/*      <Col md={6} xs={12} className="d-flex flex-row align-items-center">*/}
      {/*        <div className="min-width-0 me-md-2">*/}
      {/*          <a*/}
      {/*            className="font-small single-line-ellipsis"*/}
      {/*            target="_blank"*/}
      {/*            href={*/}
      {/*              inputExplorer == null || txIdInput == null ? null : inputExplorer + txIdInput*/}
      {/*            }*/}
      {/*          >*/}
      {/*            {txIdInput || 'None'}*/}
      {/*          </a>*/}
      {/*          <span className="d-flex align-items-center font-weight-500 my-1">*/}
      {/*            <TokenIcon tokenOrTicker={input.token} className="currency-icon-medium" />*/}
      {/*            {input.amount} {input.token.ticker || '???'}*/}
      {/*          </span>*/}
      {/*          <small className="single-line-ellipsis">{inputAddress}</small>*/}
      {/*        </div>*/}
      {/*        <Icon*/}
      {/*          size={22}*/}
      {/*          icon={ic_arrow_forward}*/}
      {/*          className="d-md-block d-none"*/}
      {/*          style={{*/}
      {/*            marginLeft: 'auto',*/}
      {/*            marginRight: '-22px',*/}
      {/*            marginBottom: '6px',*/}
      {/*          }}*/}
      {/*        />*/}
      {/*      </Col>*/}
      {/*      <Col md={0} xs={12} className="d-md-none d-flex justify-content-center">*/}
      {/*        <Icon*/}
      {/*          size={22}*/}
      {/*          icon={ic_arrow_downward}*/}
      {/*          className=""*/}
      {/*          style={{ marginBottom: '6px' }}*/}
      {/*        />*/}
      {/*      </Col>*/}
      {/*      <Col md={6} xs={12} className="ps-md-4">*/}
      {/*        <a*/}
      {/*          className="font-small single-line-ellipsis"*/}
      {/*          target="_blank"*/}
      {/*          href={*/}
      {/*            outputExplorer == null || txIdOutput == null ? null : outputExplorer + txIdOutput*/}
      {/*          }*/}
      {/*        >*/}
      {/*          {txIdOutput || '...'}*/}
      {/*        </a>*/}
      {/*        <span className="d-flex align-items-center font-weight-500 my-1">*/}
      {/*          <TokenIcon tokenOrTicker={output.token} className="currency-icon-medium" />*/}
      {/*          {output.amount} {output.token.ticker || '???'}*/}
      {/*        </span>*/}
      {/*        <small className="single-line-ellipsis">{outputAddress}</small>*/}
      {/*      </Col>*/}
      {/*    </Row>*/}
      {/*  </div>*/}
      {/*</Col>*/}
      <Col md={4} sm={12} className="is-token">
        <HistoryToken
          token={input.token}
          amount={input.amount}
          address={inputAddress}
          label="from"
        />
        <div className="is-arrow">
          <i className="icon icon-arrow-right"></i>
        </div>
      </Col>
      <Col md={3} sm={12} className="is-token">
        <HistoryToken
          token={output.token}
          amount={output.amount}
          address={outputAddress}
          label="to"
        />
      </Col>
      <Col md={1} sm={12} className="is-value is-right">
        <div>{outputUsdValue != null ? FEConstants.USDollar.format(outputUsdValue) : '-'}</div>
      </Col>
      <Col md={2} sm={12} className="d-flex text-end flex-column is-date is-right">
        <div className="sc-date">{formatDate(props.swap.createdAt)}</div>
        <div className="sc-time">{formatTime(props.swap.createdAt)}</div>
      </Col>
      <Col md={2} sm={12} className="d-flex text-end flex-column is-status">
        {claimable || refundable ? (
          <Button
            variant={claimable || refundable ? 'primary' : 'secondary'}
            size="sm"
            // href removed to prevent navigation conflicts
            className="width-fill"
            onClick={navigateToSwap}
          >
            {refundable ? 'Refund' : claimable ? 'Claim' : 'View'}
          </Button>
        ) : (
          badge
        )}
      </Col>
    </Row>
  );
}
