import { Token } from '@atomiqlabs/sdk';
import * as React from 'react';
import { useState } from 'react';
import { ChainIcon } from '../tokens/ChainIcon';
import { truncateAddress } from '../../utils/Utils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

export function HistoryToken(props: {
  token: Token;
  amount: string;
  address?: string;
  label?: string;
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

  return (
    <div className="history-entry__token">
      <ChainIcon token={props.token} />
      <div className="history-entry__token__data">
        <div className="history-entry__token__amount">
          {props.amount} {props.token.ticker || '???'}
        </div>
        {props.address && (
          <div className="history-entry__token__address">
            {props.label && <span className="sc-sub">{props.label}</span>}
            <span className="sc-address">{truncateAddress(props.address)}</span>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="copy-address-tooltip">Copy address</Tooltip>}
            >
              <i
                className="icon icon-copy"
                onClick={handleCopyAddress}
                style={{ cursor: 'pointer' }}
              ></i>
            </OverlayTrigger>
          </div>
        )}
      </div>
    </div>
  );
}
