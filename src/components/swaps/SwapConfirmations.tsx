import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import { FEConstants } from '../../FEConstants';
import {TxDataType} from "../../types/swaps/TxDataType";

export function SwapConfirmations(props: {
  txData: TxDataType;
}) {
  if(!props.txData) return null;

  return (
    <div className="swap-confirmations">
      <div className="swap-confirmations__name">
        Transaction received, waiting for confirmations...
      </div>

      <div className="swap-confirmations__estimate">
        <Spinner />
        <div className="swap-confirmations__estimate__info">
          <div className="swap-confirmations__estimate__item">
            {props.txData.confirmations.actual} / {props.txData.confirmations.required} Confirmations
          </div>
          <div className="swap-confirmations__estimate__item is-eta">
            ETA: {props.txData.eta.text}
          </div>
        </div>
      </div>

      <a
        href={FEConstants.btcBlockExplorer + props.txData.txId}
        target="_blank"
        className="swap-confirmations__link"
      >
        <div className="sc-text">View transaction</div>
        <div className="icon icon-new-window"></div>
      </a>
    </div>
  );
}
