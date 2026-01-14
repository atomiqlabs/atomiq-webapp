import { useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BaseButton } from '../common/BaseButton';
import * as React from 'react';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { TemporaryTooltip } from '../TemporaryTooltip';

export type DisconnectedWalletQrAndAddressProps = {
  //Displayed in the QR code and in text field
  address: {
    description: string;
    value: string;
    hyperlink: string;
    copy: () => boolean;
  };
  //Pay with external bitcoin wallet by invoking a bitcoin: deeplink
  payWithDeeplink: {
    text: string | JSX.Element;
    onClick: () => void;
  };
  //Connect browser wallet and automatically pay after
  payWithBrowserWallet: {
    text: string | JSX.Element;
    loading: boolean;
    onClick: () => void;
  };
  //Data for auto claim switch
  autoClaim?: {
    value: boolean;
    onChange: (val: boolean) => void;
  };
  //Actively scanning for NFC cards to pay with (NFC icon should be displayed in the QR code)
  nfcScanning?: boolean;
  alert?: string | JSX.Element;
};

export function DisconnectedWalletQrAndAddress(props: DisconnectedWalletQrAndAddressProps) {
  const addressContent = useCallback(
    (show) => (
      <div className="swap-panel__card__group">
        {!!props.alert && (
          <div className="alert-message is-warning mb-3">
            <i className="alert-message__icon icon icon-Notice"></i>
            <div className="alert-message__body">{props.alert}</div>
          </div>
        )}

        <QRCodeSVG
          value={props.address.hyperlink}
          size={240}
          includeMargin={true}
          className="cursor-pointer m-auto"
          onClick={(event) => {
            if (props.address.copy()) show(event.target);
          }}
          imageSettings={
            props.nfcScanning
              ? {
                  src: '/icons/contactless.png',
                  excavate: true,
                  height: 50,
                  width: 50,
                }
              : null
          }
        />

        <div className="wallet-address-preview">
          <div className="wallet-address-preview__content">
            <div className="wallet-address-preview__title">{props.address.description}</div>
            <div className="wallet-address-preview__address">
              <div className="sc-text">{props.address.value}</div>
              <div className="wallet-address-preview__indicator"></div>
            </div>
          </div>
          <div
            className="wallet-address-preview__action"
            onClick={(event) => {
              if (props.address.copy()) show(event.target);
            }}
          >
            <div className="icon icon-copy"></div>
          </div>
        </div>

        <div className="payment-awaiting-buttons">
          <BaseButton
            variant="secondary"
            onClick={props.payWithBrowserWallet.onClick}
            disabled={props.payWithBrowserWallet.loading}
          >
            {typeof props.payWithBrowserWallet.text === 'string' ? (
              <>
                <i className="icon icon-new-window"></i>
                <div className="sc-text">{props.payWithBrowserWallet.text}</div>
              </>
            ) : (
              props.payWithBrowserWallet.text
            )}
          </BaseButton>
          <BaseButton variant="secondary" onClick={props.payWithDeeplink.onClick}>
            {typeof props.payWithDeeplink.text === 'string' ? (
              <>
                <i className="icon icon-new-window"></i>
                <div className="sc-text">{props.payWithDeeplink.text}</div>
              </>
            ) : (
              props.payWithDeeplink.text
            )}
          </BaseButton>
        </div>
      </div>
    ),
    [
      props.payWithDeeplink,
      props.payWithBrowserWallet,
      props.address,
      props.alert,
      props.nfcScanning,
    ]
  );

  return (
    <>
      <TemporaryTooltip placement="top" text="Copied to clipboard!">
        {addressContent}
      </TemporaryTooltip>

      {!!props.autoClaim && (
        <div className="swap-panel__card__group">
          <Form className="auto-claim">
            <div className="auto-claim__label">
              <label title="" htmlFor="autoclaim" className="form-check-label">
                Auto-claim
              </label>
              <OverlayTrigger
                overlay={
                  <Tooltip id="autoclaim-pay-tooltip">
                    Automatically requests authorization of the claim transaction through your
                    wallet as soon as the lightning payment arrives.
                  </Tooltip>
                }
              >
                <i className="icon icon-info"></i>
              </OverlayTrigger>
            </div>
            <Form.Check // prettier-ignore
              id="autoclaim"
              type="switch"
              onChange={(val) => props.autoClaim.onChange(val.target.checked)}
              checked={props.autoClaim.value}
            />
          </Form>
        </div>
      )}
    </>
  );
}
