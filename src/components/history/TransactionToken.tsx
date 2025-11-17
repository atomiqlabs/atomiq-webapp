import { Token } from '@atomiqlabs/sdk';
import * as React from 'react';
import { useState } from 'react';
import { ChainIcon } from '../tokens/ChainIcon';
import { truncateAddress } from '../../utils/Utils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { ic_check_circle } from 'react-icons-kit/md/*';

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
          {props.amount} {props.token.ticker || '???'}
        </div>
        <div className="transaction-token__address">
          {props.address && (
            <>
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
            </>
          )}
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
