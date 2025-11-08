import * as React from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import { getDeltaText } from '../../utils/Utils';
import { FEConstants } from '../../FEConstants';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';

export interface TxData {
  txId: string;
  confirmations: number;
  confTarget: number;
  txEtaMs: number;
}

interface SwapConfirmationsProps {
  txData: TxData | null;
  isClaimable: boolean;
  claimable: boolean;
  chainId?: string;
  onClaim?: () => void;
  claimLoading?: boolean;
  claimError?: any;
}

export function SwapConfirmations(props: SwapConfirmationsProps) {
  // State 1: Confirming - Transaction received, waiting for confirmations
  if (props.txData && !props.isClaimable) {
    const { txId, confirmations, confTarget, txEtaMs } = props.txData;

    return (
      <div className="swap-confirmations">
        <div className="swap-confirmations__name">
          Transaction received, waiting for confirmations...
        </div>

        <div className="swap-confirmations__estimate">
          <Spinner />
          <label>
            {confirmations} / {confTarget}
          </label>
          <label>Confirmations</label>
        </div>

        <a
          href={FEConstants.btcBlockExplorer + txId}
          target="_blank"
          className="swap-confirmations__link"
        >
          <div className="sc-text">View transaction</div>
          <div className="icon icon-new-window"></div>
        </a>

        <Badge className={'text-black' + (txEtaMs == null ? ' d-none' : '')} bg="light" pill>
          ETA:{' '}
          {txEtaMs === -1 || txEtaMs > 60 * 60 * 1000 ? '>1 hour' : '~' + getDeltaText(txEtaMs)}
        </Badge>
      </div>
    );
  }

  // State 2: Confirmed - Transaction confirmed, waiting for watchtowers
  if (props.isClaimable && !props.claimable) {
    return (
      <div className="swap-confirmations">
        <div className="swap-confirmations__estimate">
          <Spinner />
        </div>
        <div className="swap-confirmations__name">
          Transaction received & confirmed, waiting for claim by watchtowers...
        </div>
      </div>
    );
  }

  // State 3: Claimable - Ready to claim manually
  if (props.isClaimable && props.claimable) {
    return (
      <div className="swap-confirmations">
        <div className="swap-confirmations__name">
          Transaction received & confirmed, you can claim your funds manually now!
        </div>

        {props.claimError && (
          <ErrorAlert className="mb-3" title="Claim error" error={props.claimError} />
        )}

        <ButtonWithWallet
          chainId={props.chainId}
          onClick={props.onClaim}
          disabled={props.claimLoading}
          size="lg"
        >
          {props.claimLoading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
          Finish swap (claim funds)
        </ButtonWithWallet>
      </div>
    );
  }

  return null;
}
