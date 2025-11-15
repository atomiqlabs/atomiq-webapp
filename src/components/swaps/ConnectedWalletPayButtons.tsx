import { BaseButton } from '../common/BaseButton';
import { Spinner } from 'react-bootstrap';
import * as React from 'react';
import { Chain } from '../../providers/ChainsProvider';

export function ConnectedWalletPayButtons(props: {
  wallet: Chain<any>['wallet'];
  payWithBrowserWallet: {
    loading: boolean;
    onClick: () => void;
  };
  useExternalWallet: {
    onClick: () => void;
  };
}) {
  return (
    <div className="swap-panel__card__group">
      <div className="payment-awaiting-buttons">
        <BaseButton
          variant="secondary"
          textSize="sm"
          className="d-flex flex-row align-items-center"
          disabled={props.payWithBrowserWallet.loading}
          onClick={props.payWithBrowserWallet.onClick}
        >
          {props.payWithBrowserWallet.loading ? (
            <Spinner animation="border" size="sm" className="mr-2" />
          ) : (
            ''
          )}
          Pay with <img width={20} height={20} src={props.wallet.icon} /> {props.wallet.name}
        </BaseButton>

        <BaseButton
          variant="secondary"
          textSize="sm"
          className="d-flex flex-row align-items-center"
          onClick={props.useExternalWallet.onClick}
        >
          Use a QR/wallet address
        </BaseButton>
      </div>
    </div>
  );
}
