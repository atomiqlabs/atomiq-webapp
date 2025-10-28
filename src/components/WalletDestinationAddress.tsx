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
  quote: any; // Quote object to check destination validity

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
  quote,
  onAddressChange,
  disconnectWallet,
  setQrScanning,
}: WalletDestinationAddressProps) {
  // Compute whether the address is from a connected wallet
  const isOutputWalletAddress = useMemo(
    () => outputChainData?.wallet?.address === addressState.value || (webLnForOutput && !!addressState.value),
    [outputChainData?.wallet?.address, addressState.value, webLnForOutput]
  );

  // Validation error (actual errors that make the input invalid)
  const validationError = useMemo(() => {
    if (!addressState.userInput || addressState.userInput.trim() === '') return null;
    if (isOutputWalletAddress || addressState.value !== addressState.userInput) return null;

    // Only return actual address parsing errors, not warnings
    return addressState.error?.message;
  }, [addressState, isOutputWalletAddress]);

  // Warning message for valid addresses with potential issues
  const warningMessage = useMemo(() => {
    if (!addressState.userInput || addressState.userInput.trim() === '') return null;
    if (isOutputWalletAddress || addressState.value !== addressState.userInput) return null;
    if (!quote || !addressState.data) return null; // Only show warnings if address is valid (has data)
    if (addressState.error) return null; // Don't show warnings if there's a validation error

    // TODO not really tested, just estimated once it will return true
    if (quote.willLikelyFail?.()) {
      return 'This destination is likely not payable.';
    }

    if (quote.isPayingToNonCustodialWallet?.()) {
      return 'Please make sure your receiving wallet is online';
    }

    return null;
  }, [addressState, isOutputWalletAddress, quote]);

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
      {!(webLnForOutput && validatedAmount == null) && (
        <>
          {webLnForOutput && !isOutputWalletAddress ? (
            <div className="wallet-address__body">
              <a
                href="#"
                className="wallet-address__invoice-button"
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
                <i className="icon icon-Lightning-invoice"></i>
                <span className="sc-text">Fetch invoice from WebLN</span>
              </a>
            </div>
          ) : (
            <>
              <div className="wallet-address__body">
                <div className="wallet-address__title">
                  {outputChainData?.chain?.name ?? outputToken?.chain ?? 'Wallet'} Destination
                  Address
                </div>
                <ValidatedInput
                  type={'text'}
                  className={'wallet-address__form with-inline-icon'}
                  onChange={(val, forcedChange) => {
                    onAddressChange(val, !forcedChange);
                  }}
                  value={addressState.value}
                  inputRef={addressRef}
                  placeholder={'Enter destination address'}
                  onValidate={addressValidator}
                  validated={validationError}
                  disabled={locked || outputChainData?.wallet != null}
                  textEnd={
                    isOutputWalletAddress || addressState.data?.amount != null ? (
                      <span className="icon icon-check"></span>
                    ) : validationError && addressState.userInput ? (
                      <span className="icon icon-invalid-error"></span>
                    ) : warningMessage ? (
                      <span className="icon icon-info"></span>
                    ) : null
                  }
                  textStart={addressState.loading ? <Spinner className="text-white" /> : null}
                  successFeedback={
                    isOutputWalletAddress
                      ? 'Wallet address fetched from ' + outputChainData?.wallet.name + '.'
                      : addressState.data?.amount != null
                        ? 'Swap amount imported from lightning network invoice.'
                        : null
                  }
                  dynamicTextEndPosition={true}
                />
                {warningMessage && (
                  <div className="wallet-address__feedback is-warning">{warningMessage}</div>
                )}
              </div>

              <div className="wallet-address__action">
                {locked ? null : outputChainData?.wallet != null ? (
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id="scan-qr-tooltip">
                        Disconnect wallet & use external wallet
                      </Tooltip>
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
            </>
          )}
        </>
      )}

      <Alert
        variant={'success'}
        className="wallet-address__alert mb-0 text-center"
        show={showLightningAlert}
      >
        <label>
          Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for
          variable amount.
        </label>
      </Alert>
    </div>
  );
}
