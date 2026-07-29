import {
  fromHumanReadableString,
  SingleAddressBitcoinWallet,
  toHumanReadableString,
} from '@atomiqlabs/sdk';
import BigNumber from 'bignumber.js';
import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { SwapperContext } from '../../context/SwapperContext';
import { ChainsConfig } from '../../data/ChainsConfig';
import { useAsync } from '../../hooks/utils/useAsync';
import { useWithAwait } from '../../hooks/utils/useWithAwait';
import { Tokens } from '../../utils/SwapperFactory';
import { BaseButton } from '../common/BaseButton';
import { GenericModal } from '../common/GenericModal';
import { SwapStepAlert } from '../swaps/SwapStepAlert';
import ValidatedInput, { numberValidator } from '../ValidatedInput';

const SEND_MAX_AMOUNT = Symbol('send-max');

type SendAmountState = string | typeof SEND_MAX_AMOUNT;

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function formatBtc(amount?: bigint): string {
  return amount == null ? '' : toHumanReadableString(amount, Tokens.BITCOIN.BTC);
}

function IntermediateBitcoinWalletSendModalContent(props: {
  wallet?: SingleAddressBitcoinWallet;
  close: () => void;
  refreshBalance: () => Promise<unknown>;
  onSendingChange: (sending: boolean) => void;
}) {
  const { swapper } = useContext(SwapperContext);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState<SendAmountState>('');

  const trimmedAddress = address.trim();
  const validatedAddress =
    trimmedAddress.length > 0 && swapper?.Utils.isValidBitcoinAddress(trimmedAddress)
      ? trimmedAddress
      : undefined;
  const addressValid = validatedAddress != null;

  const validateAddress = useCallback(
    (value: string) => {
      const candidate = value.trim();
      if (candidate.length === 0) return null;
      if (!swapper?.Utils.isValidBitcoinAddress(candidate)) return 'Invalid Bitcoin address';
      return null;
    },
    [swapper]
  );

  const [spendableBalance, spendableLoading, spendableError, refreshSpendableBalance] =
    useWithAwait(
      () => {
        if (props.wallet == null) return null;
        if (validatedAddress == null) return props.wallet.getSpendableBalance();
        return props.wallet.getSpendableBalance(undefined, undefined, validatedAddress);
      },
      [props.wallet, validatedAddress],
      false
    );

  const maxSelected = amount === SEND_MAX_AMOUNT;
  const displayedAmount = maxSelected ? formatBtc(spendableBalance?.balance) : amount;

  const validateAmount = useMemo(() => {
    const validateNumber = numberValidator(
      {
        min: new BigNumber('0.00000001'),
        max: spendableBalance==null ? undefined : new BigNumber(formatBtc(spendableBalance.balance)),
      },
      true
    );
    return (value: string) => {
      const numberError = validateNumber(value);
      if (numberError != null || value === '') return numberError;
      const parsed = new BigNumber(value);
      if (parsed.decimalPlaces() > Tokens.BITCOIN.BTC.decimals)
        return `Use at most ${Tokens.BITCOIN.BTC.decimals} decimal places`;
      return null;
    };
  }, [spendableBalance]);

  const manualAmountError = maxSelected ? null : validateAmount(displayedAmount);
  const manualRawAmount = useMemo(() => {
    if (maxSelected || displayedAmount === '' || manualAmountError != null) return null;
    return fromHumanReadableString(displayedAmount, Tokens.BITCOIN.BTC);
  }, [maxSelected, displayedAmount, manualAmountError]);

  const [manualNetworkFee, feeLoading, feeError] = useWithAwait(
    () => {
      if (
        maxSelected ||
        props.wallet == null ||
        validatedAddress == null ||
        spendableBalance == null ||
        manualRawAmount == null
      )
        return null;
      return props.wallet.getTransactionFee(
        validatedAddress,
        manualRawAmount,
        spendableBalance.feeRate
      );
    },
    [
      maxSelected,
      props.wallet,
      validatedAddress,
      spendableBalance?.feeRate,
      manualRawAmount,
    ],
    false
  );

  const transactionAmount = maxSelected ? spendableBalance?.balance : manualRawAmount;
  const networkFee = maxSelected
    ? spendableBalance?.totalFee
    : manualNetworkFee;
  const currentFeeReady = maxSelected ? spendableBalance != null : manualNetworkFee != null;
  const canSend =
    props.wallet != null &&
    addressValid &&
    spendableBalance != null &&
    transactionAmount != null &&
    transactionAmount > 0n &&
    currentFeeReady &&
    !spendableLoading &&
    !feeLoading;

  const [sendTransaction, sendLoading, txId, sendError] = useAsync(
    async () => {
      if (
        !canSend ||
        props.wallet == null ||
        spendableBalance == null ||
        validatedAddress == null ||
        transactionAmount == null
      )
        throw new Error('Enter a valid destination and amount');

      const result = await props.wallet.sendTransaction(
        validatedAddress,
        transactionAmount,
        spendableBalance.feeRate
      );
      void props.refreshBalance();
      return result;
    },
    [
      canSend,
      props.wallet,
      props.refreshBalance,
      validatedAddress,
      transactionAmount,
      spendableBalance,
    ],
    true
  );

  useEffect(() => {
    props.onSendingChange(sendLoading);
  }, [sendLoading, props.onSendingChange]);

  useEffect(() => {
    return () => props.onSendingChange(false);
  }, [props.onSendingChange]);

  if (txId != null) {
    return (
      <>
        <SwapStepAlert
          className="w-100 mt-0 text-center border-0"
          type="success"
          title="BTC sent"
          description="The transaction was broadcasted successfully."
          action={
            ChainsConfig.BITCOIN.blockExplorer == null
              ? undefined
              : {
                  type: 'link',
                  text: 'View transaction',
                  href: ChainsConfig.BITCOIN.blockExplorer + txId,
                }
          }
        />
        <ValidatedInput
          className="w-100 mt-3"
          label="Transaction ID"
          value={txId}
          readOnly={true}
          copyEnabled={true}
        />
        <BaseButton variant="secondary" className="w-100 mt-4" onClick={props.close}>
          Close
        </BaseButton>
      </>
    );
  }

  return (
    <>
      <ValidatedInput
        className="w-100 text-start mb-3"
        inputId="intermediate-bitcoin-destination"
        label="Destination address"
        labelClassName="text-white"
        value={address}
        placeholder="Bitcoin address"
        onChange={setAddress}
        onValidate={validateAddress}
        disabled={props.wallet == null || sendLoading}
      />

      <div className="w-100 d-flex justify-content-between align-items-center mb-2">
        <label
          className="form-label text-white mb-0"
          htmlFor="intermediate-bitcoin-amount"
        >
          Amount
        </label>
        <div className="wallet-connections wallet-connections__simple">
          {spendableLoading ? (
            <div className="wallet-connections__amount is-loading"></div>
          ) : (
            <div className="wallet-connections__amount">
              {spendableBalance == null
                ? '— BTC'
                : `${formatBtc(spendableBalance.balance)} BTC`}
            </div>
          )}
          <BaseButton
            variant="border-only"
            className="wallet-connections__simple__max !mr-0"
            onClick={() => setAmount(SEND_MAX_AMOUNT)}
            disabled={props.wallet == null || sendLoading}
          >
            Max
          </BaseButton>
        </div>
      </div>

      <ValidatedInput
        className="w-100 text-start mb-3"
        inputId="intermediate-bitcoin-amount"
        type="number"
        value={displayedAmount}
        placeholder="0.00000000"
        textEnd={<span className="text-white opacity-75">BTC</span>}
        step={new BigNumber('0.00000001')}
        onChange={(value: string) => setAmount(value)}
        onValidate={validateAmount}
        disabled={props.wallet == null || sendLoading}
        textStart={
          maxSelected && spendableLoading ? (
            <Spinner animation="border" size="sm" />
          ) : undefined
        }
      />

      {addressValid && spendableLoading && (
        <small className="w-100 text-start text-white opacity-75 mb-3">
          Recalculating the maximum for this destination…
        </small>
      )}

      {spendableError != null && (
        <SwapStepAlert
          className="w-100 mt-0 mb-3"
          type="error"
          title="Unable to load spendable balance"
          error={asError(spendableError)}
          action={{
            type: 'button',
            text: 'Retry',
            onClick: refreshSpendableBalance,
          }}
        />
      )}

      <div className="w-100 d-flex justify-content-between align-items-center mb-3 text-white">
        <span className="opacity-75">Bitcoin network fee</span>
        <strong>
          {feeLoading ? (
            <Spinner animation="border" size="sm" />
          ) : networkFee == null ? (
            '—'
          ) : (
            `${networkFee} sats (${formatBtc(BigInt(networkFee))} BTC)`
          )}
        </strong>
      </div>

      {feeError != null && (
        <SwapStepAlert
          className="w-100 mt-0 mb-3"
          type="error"
          title="Unable to estimate network fee"
          error={feeError}
        />
      )}

      {sendError != null && (
        <SwapStepAlert
          className="w-100 mt-0 mb-3"
          type="error"
          title="Unable to send BTC"
          error={asError(sendError)}
        />
      )}

      <BaseButton
        variant="secondary"
        className="w-100 mt-2"
        disabled={!canSend}
        isLoading={sendLoading}
        loadingText="Sending..."
        onClick={sendTransaction}
      >
        Send BTC
      </BaseButton>
    </>
  );
}

export function IntermediateBitcoinWalletSendModal(props: {
  opened: boolean;
  close: () => void;
  wallet?: SingleAddressBitcoinWallet;
  refreshBalance: () => Promise<unknown>;
}) {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!props.opened) setSending(false);
  }, [props.opened]);

  return (
    <GenericModal
      className="text-white"
      visible={props.opened}
      size="sm"
      type="default"
      onClose={props.close}
      title="Send Bitcoin"
      enableClose={!sending}
      enableCloseFromOverlay={!sending}
    >
      {props.opened && (
        <IntermediateBitcoinWalletSendModalContent
          wallet={props.wallet}
          close={props.close}
          refreshBalance={props.refreshBalance}
          onSendingChange={setSending}
        />
      )}
    </GenericModal>
  );
}
