import * as React from 'react';
import { useMemo } from 'react';
import { Alert, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import ValidatedInput, { ValidatedInputRef } from './ValidatedInput';
import { ChainWalletData } from '../wallets/ChainDataProvider';
import { Token, isBtcToken } from '@atomiqlabs/sdk';
import { WebLNProvider } from 'webln';
import { fromHumanReadableString } from '@atomiqlabs/sdk';
import { Tokens } from '../FEConstants';

export interface AddressInputState {
  value: string; // The computed/final address to display
  userInput: string; // The user's raw input
  data: any; // Parsed address data
  loading: boolean;
  error: any;
}

interface WalletDestinationAddressProps {
  // Core wallet/token data
  outputChainData: ChainWalletData<any>;
  outputToken: Token;

  // Address state (grouped)
  addressState: AddressInputState;
  addressRef: React.MutableRefObject<ValidatedInputRef>;
  addressValidator: (val: string) => string | null;

  // UI state
  locked: boolean;
  webLnForOutput: boolean;
  validatedAmount: string | null;
  destinationWarnings: string[];

  // Callbacks
  onAddressChange: (address: string, isManualChange: boolean) => void;
  disconnectWallet: (chainId: string) => void;
  setQrScanning: (scanning: boolean) => void;
}

export function WalletDestinationAddress({
  outputChainData,
  outputToken,
  addressState,
  addressRef,
  addressValidator,
  locked,
  webLnForOutput,
  validatedAmount,
  destinationWarnings,
  onAddressChange,
  disconnectWallet,
  setQrScanning,
}: WalletDestinationAddressProps) {
  // Compute whether the address is from a connected wallet
  const isOutputWalletAddress = useMemo(
    () => outputChainData?.wallet?.address === addressState.value,
    [outputChainData?.wallet?.address, addressState.value]
  );

  // Check if we should show the lightning alert
  const showLightningAlert = useMemo(
    () =>
      !locked &&
      outputChainData?.wallet == null &&
      isBtcToken(outputToken) &&
      outputToken.lightning &&
      addressState.data == null,
    [locked, outputChainData?.wallet, outputToken, addressState.data]
  );
  return (
    <div className="wallet-address">
      <div className="wallet-address__body">
        <div className="wallet-address__title">
          {outputChainData?.chain?.name ?? outputToken?.chain ?? 'Wallet'} Destination Address
        </div>
        <ValidatedInput
          type={'text'}
          className={
            'wallet-address__form with-inline-icon ' +
            (webLnForOutput && addressState.data?.address == null ? 'd-none' : '')
          }
          onChange={(val, forcedChange) => {
            onAddressChange(val, !forcedChange);
          }}
          value={addressState.value}
          inputRef={addressRef}
          placeholder={'Enter destination address'}
          onValidate={addressValidator}
          validated={
            isOutputWalletAddress ||
            addressState.value !== addressState.userInput ||
            !addressState.userInput ||
            addressState.userInput.trim() === ''
              ? null
              : addressState.error?.message
          }
          disabled={locked || outputChainData?.wallet != null}
          textEnd={
            isOutputWalletAddress ? (
              <span className="icon icon-check"></span>
            ) : addressState.error?.message === 'Invalid address' && addressState.userInput ? (
              <span className="icon icon-invalid-error"></span>
            ) : null
          }
          textStart={addressState.loading ? <Spinner className="text-white" /> : null}
          successFeedback={
            isOutputWalletAddress
              ? 'Wallet address fetched from ' + outputChainData?.wallet.name + '.'
              : null
          }
          dynamicTextEndPosition={true}
        />
        {destinationWarnings.map((warning, index) => (
          <Alert key={index} variant="warning" className="mt-2 mb-0 text-center">
            {warning}
          </Alert>
        ))}
      </div>

      <div className="wallet-address__action">
        {locked ? null : outputChainData?.wallet != null ? (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="scan-qr-tooltip">Disconnect wallet & use external wallet</Tooltip>
            }
          >
            <a
              href="#"
              className="wallet-address__action__button"
              onClick={(e) => {
                e.preventDefault();
                if (outputChainData == null) return;
                disconnectWallet(outputChainData.chainId);
              }}
            >
              <span className="icon icon-disconnect"></span>
            </a>
          </OverlayTrigger>
        ) : (
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="scan-qr-tooltip">Scan QR code</Tooltip>}
          >
            <a
              href="#"
              className="wallet-address__action__button"
              onClick={(e) => {
                e.preventDefault();
                setQrScanning(true);
              }}
            >
              <span className="icon icon-qr-scan"></span>
            </a>
          </OverlayTrigger>
        )}
      </div>
      {webLnForOutput ? (
        <>
          {addressState.data?.address == null && validatedAmount != null ? (
            <div className="mt-2">
              <a
                href="#"
                onClick={async (e) => {
                  e.preventDefault();
                  if (validatedAmount == null) return;
                  const webln: WebLNProvider = outputChainData.wallet.instance;
                  try {
                    const res = await webln.makeInvoice(
                      Number(fromHumanReadableString(validatedAmount, Tokens.BITCOIN.BTCLN))
                    );
                    addressRef.current.setValue(res.paymentRequest);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Fetch invoice from WebLN
              </a>
            </div>
          ) : (
            ''
          )}
        </>
      ) : (
        ''
      )}

      <Alert variant={'success'} className="mt-3 mb-0 text-center" show={showLightningAlert}>
        <label>
          Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for
          variable amount.
        </label>
      </Alert>
    </div>
  );
}
