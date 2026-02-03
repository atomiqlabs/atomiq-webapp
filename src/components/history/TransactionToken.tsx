import { Token } from '@atomiqlabs/sdk';
import * as React from 'react';
import { ChainIcon } from '../tokens/ChainIcon';
import {truncateAddress, truncateAmount} from '../../utils/Utils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export function TransactionToken(props: {
  token: Token;
  amount: string;
  address?: string;
  label?: string;
  txId?: string;
  explorer?: string;
}) {
  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (props.address) {
      try {
        await navigator.clipboard.writeText(props.address);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="transaction-token">
      <ChainIcon token={props.token} />
      <div className="transaction-token__data">
        <div className="transaction-token__amount">
          {truncateAmount(props.amount)} {props.token.ticker || '???'}
        </div>
        <div className="transaction-token__address">
          <>
            {props.label && <span className="sc-sub">{props.label}</span>}
            <span className="sc-address">
              {!!props.address ? truncateAddress(props.address) : 'Unknown'}
            </span>
            {props.address && <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="copy-address-tooltip">Copy address</Tooltip>}
            >
              <i
                className="icon icon-copy"
                onClick={handleCopyAddress}
                style={{ cursor: 'pointer' }}
              ></i>
            </OverlayTrigger>}
          </>
          {props.explorer != null && props.txId != null && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="view-transaction-tooltip">View transaction</Tooltip>}
            >
              <a
                className="sc-link icon icon-new-window"
                target="_blank"
                href={props.explorer + props.txId}
                onClick={handleLinkClick}
              ></a>
            </OverlayTrigger>
          )}
        </div>
      </div>
    </div>
  );
}
