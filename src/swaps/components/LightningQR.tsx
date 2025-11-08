import { Badge, Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { CopyOverlay } from '../../components/CopyOverlay';
import { QRCodeSVG } from 'qrcode.react';
import * as React from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FromBTCLNSwap, LnForGasSwap } from '@atomiqlabs/sdk';
import { ChainDataContext } from '../../wallets/context/ChainDataContext';
import { useAsync } from '../../utils/hooks/useAsync';
import { useNFCScanner } from '../../nfc/hooks/useNFCScanner';
import { SwapsContext } from '../context/SwapsContext';
import { NFCStartResult } from '../../nfc/NFCReader';
import { useChain } from '../../wallets/hooks/useChain';
import { BaseButton } from '../../components/BaseButton';
import { SwapStepAlert } from './SwapStepAlert';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { WalletAddressPreview } from '../../components/WalletAddressPreview';
import { AlertMessage } from '../../components/AlertMessage';

export function LightningQR(props: {
  quote: FromBTCLNSwap | LnForGasSwap;
  payInstantly: boolean;
  setAutoClaim?: (val: boolean) => void;
  autoClaim?: boolean;
  onHyperlink?: () => void;
}) {
  const { swapper } = useContext(SwapsContext);
  const { disconnectWallet, connectWallet } = useContext(ChainDataContext);
  const lightningChainData = useChain('LIGHTNING');

  const [payingWithLNURL, setPayingWithLNURL] = useState<boolean>(false);
  const NFCScanning = useNFCScanner(
    (address) => {
      //TODO: Maybe we need to stop the scanning here as well
      swapper.Utils.getLNURLTypeAndData(address, false)
        .then((result) => {
          if (result.type !== 'withdraw') return;
          return result;
        })
        .then((lnurlWithdraw) => {
          return (props.quote as FromBTCLNSwap).settleWithLNURLWithdraw(lnurlWithdraw);
        })
        .then(() => {
          setPayingWithLNURL(true);
        });
    },
    !(props.quote instanceof FromBTCLNSwap)
  );

  const [pay, payLoading, payResult, payError] = useAsync(
    () => lightningChainData.wallet.instance.sendPayment(props.quote.getAddress()),
    [lightningChainData.wallet, props.quote]
  );

  const [callPayFlag, setCallPayFlag] = useState<boolean>(false);
  useEffect(() => {
    if (!callPayFlag) return;
    setCallPayFlag(false);
    if (!lightningChainData.wallet) return;
    pay();
  }, [callPayFlag, lightningChainData.wallet, pay]);

  useEffect(() => {
    if (props.quote == null || !props.payInstantly) return;
    if (lightningChainData.wallet != null) pay();
  }, [props.quote, props.payInstantly]);

  const qrContent = useCallback(
    (show) => {
      return (
        <>
          <div className="swap-panel__card__subtitle">
            <i className="ico icon-arrow-down"></i>
            <div className="sc-text">Initiate payment to this lightning network invoice</div>
            <i className="ico icon-arrow-down"></i>
          </div>
          <QRCodeSVG
            value={props.quote.getHyperlink()}
            size={240}
            includeMargin={true}
            className="cursor-pointer"
            onClick={(event) => {
              show(event.target, props.quote.getAddress());
            }}
            imageSettings={
              NFCScanning === NFCStartResult.OK
                ? {
                    src: '/icons/contactless.png',
                    excavate: true,
                    height: 50,
                    width: 50,
                  }
                : null
            }
          />

          <WalletAddressPreview
            address={props.quote.getAddress()}
            chainName="Lightning Network"
            numberName={'invoice'}
            onCopy={() => {
              navigator.clipboard.writeText(props.quote.getAddress());
            }}
          />
          <div className="payment-awaiting-buttons">
            <BaseButton
              variant="secondary"
              onClick={
                props.onHyperlink ||
                (() => {
                  window.location.href = props.quote.getHyperlink();
                })
              }
            >
              <i className="icon icon-connect"></i>
              <div className="sc-text">Pay with LN Wallet</div>
            </BaseButton>
            <BaseButton
              variant="secondary"
              textSize="sm"
              className="d-flex flex-row align-items-center"
              onClick={() => {
                connectWallet('LIGHTNING').then((success) => {
                  // Call pay on next state update
                  if (success) setCallPayFlag(true);
                });
              }}
            >
              <img width={20} height={20} src="/wallets/WebLN.png" className="ms-2 me-1" />
              Pay via WebLN
            </BaseButton>
          </div>
        </>
      );
    },
    [props.quote, props.onHyperlink, NFCScanning, connectWallet, setCallPayFlag]
  );

  return (
    <div>
      {payingWithLNURL ? (
        <div className="d-flex flex-column align-items-center justify-content-center">
          <Spinner animation="border" />
          Paying via NFC card...
        </div>
      ) : lightningChainData.wallet != null ? (
        <>
          <SwapStepAlert
            show={!!payError}
            type="error"
            icon={ic_warning}
            title="Sending Lightning payment failed"
            description={payError?.message || payError?.toString()}
            error={payError}
            className="mb-4 mt-0"
          />

          <div className="payment-awaiting-buttons">
            <BaseButton
              variant="secondary"
              textSize="sm"
              className="d-flex flex-row align-items-center"
              disabled={payLoading}
              onClick={() => {
                pay();
              }}
            >
              {payLoading ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
              <img width={20} height={20} src="/wallets/WebLN.png" className="ms-2 me-1" />
              Pay via WebLN
            </BaseButton>
            <BaseButton
              variant="secondary"
              textSize="sm"
              className="d-flex flex-row align-items-center"
              onClick={() => {
                disconnectWallet('LIGHTNING');
              }}
            >
              Or use a QR code/LN invoice
            </BaseButton>
          </div>
        </>
      ) : (
        <CopyOverlay placement="top">{qrContent}</CopyOverlay>
      )}

      {lightningChainData.wallet == null && props.setAutoClaim != null ? (
        <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-3">
          <Form.Check // prettier-ignore
            id="autoclaim"
            type="switch"
            onChange={(val) => props.setAutoClaim(val.target.checked)}
            checked={props.autoClaim}
          />
          <label title="" htmlFor="autoclaim" className="form-check-label me-2">
            Auto-claim
          </label>
          <OverlayTrigger
            overlay={
              <Tooltip id="autoclaim-pay-tooltip">
                Automatically requests authorization of the claim transaction through your wallet as
                soon as the lightning payment arrives.
              </Tooltip>
            }
          >
            <Badge bg="primary" className="pill-round" pill>
              ?
            </Badge>
          </OverlayTrigger>
        </Form>
      ) : (
        ''
      )}
    </div>
  );
}
