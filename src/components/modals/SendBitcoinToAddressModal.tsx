import * as React from 'react';
import BigNumber from 'bignumber.js';
import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import {Spinner} from "react-bootstrap";
import {
  BitcoinTokens,
  fromHumanReadableString,
  SwapType,
  TokenAmount,
  toHumanReadableString
} from "@atomiqlabs/sdk";
import {GenericModal} from "../common/GenericModal";
import {BaseButton} from "../common/BaseButton";
import {SwapStepAlert} from "../swaps/SwapStepAlert";
import ValidatedInput, {numberValidator} from "../ValidatedInput";
import {SwapperContext} from "../../context/SwapperContext";
import {useAsync} from "../../hooks/utils/useAsync";
import {useWithAwait} from "../../hooks/utils/useWithAwait";
import {useWalletBalance} from "../../hooks/wallets/useWalletBalance";
import {InternalBitcoinWebwallet} from "../../wallets/bitcoin/InternalBitcoinWebwallet";

const minimumAmount = new BigNumber("0.00000546");
const stepAmount = new BigNumber("0.00000001");

export function SendBitcoinToAddressModal(props: {
  opened: boolean;
  close: () => void;
  wallet?: InternalBitcoinWebwallet;
}) {
  const {swapper} = useContext(SwapperContext);

  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const walletOverride = useMemo(() => {
    if (props.wallet == null) return undefined;
    return {instance: props.wallet};
  }, [props.wallet]);

  const walletBalance = useWalletBalance(
    BitcoinTokens.BTC,
    SwapType.FROM_BTC,
    undefined,
    undefined,
    !props.opened,
    undefined,
    true,
    walletOverride
  );
  const spendableBalance: TokenAmount = walletBalance?.balance;
  const networkFeeRate = walletBalance?.feeRate;
  const loadingWalletData = props.opened && props.wallet != null && walletBalance == null;
  const maximumAmount = useMemo(
    () => spendableBalance == null ? undefined : new BigNumber(spendableBalance.amount),
    [spendableBalance?.amount]
  );

  const parsedAmount = useMemo<bigint>(() => {
    if (amount == null || amount.trim().length === 0) return null;
    const parsed = fromHumanReadableString(amount, BitcoinTokens.BTC);
    if (parsed == null) return null;
    return parsed <= 0n ? null : parsed;
  }, [amount]);

  const addressParser = useMemo(() => {
    if (destinationAddress == null || destinationAddress.trim().length === 0) return {valid: false};
    if (swapper == null) return {valid: false};

    try {
      const parsedAddress = swapper.Utils.parseAddressSync(destinationAddress);
      if (parsedAddress == null) return {valid: false, validation: 'Invalid Bitcoin address'};
      if (parsedAddress.type !== "BITCOIN") return {valid: false, validation: 'Only on-chain Bitcoin addresses are supported'};
      return {
        valid: true,
        address: parsedAddress.address
      };
    } catch (e) {
      return {
        valid: false,
        validation: e?.message ?? "Invalid Bitcoin address"
      };
    }
  }, [destinationAddress, swapper]);

  const validateAmount = useCallback((value: string) => {
    return numberValidator({
      min: minimumAmount,
      max: maximumAmount
    }, true)(value);
  }, [maximumAmount]);

  const amountValidation = useMemo(() => validateAmount(amount), [amount, validateAmount]);

  const shouldEstimateFee = props.opened &&
    props.wallet != null &&
    parsedAmount != null &&
    addressParser.valid &&
    networkFeeRate != null &&
    amountValidation == null &&
    amount !== '' &&
    amount != null;

  const [estimatedFeeResult, loadingFeeEstimate, feeEstimateError] = useWithAwait<number | null>(
    async () => props.wallet.getTransactionFee(addressParser.address, parsedAmount, networkFeeRate),
    [props.wallet, addressParser.address, parsedAmount, networkFeeRate],
    true,
    undefined,
    !shouldEstimateFee
  );
  const estimatedFee = shouldEstimateFee ? estimatedFeeResult : null;

  const canSend = useMemo(() => {
    return (
      shouldEstimateFee &&
      estimatedFee != null &&
      !loadingFeeEstimate
    );
  }, [shouldEstimateFee, estimatedFee, loadingFeeEstimate]);

  const [send, sending, sendTxId, sendError, clearSend] = useAsync(async () => {
    const txId = await props.wallet.sendTransaction(addressParser.address, parsedAmount, networkFeeRate);
    setDestinationAddress('');
    setAmount('');
    return txId;
  }, [props.wallet, addressParser.address, parsedAmount, networkFeeRate]);

  useEffect(() => {
    if (!props.opened) {
      setDestinationAddress('');
      setAmount('');
      clearSend();
      return;
    }
  }, [props.opened]);

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="notice"
      onClose={() => props.close()}
      title="Send BTC"
      enableClose={!sending}
    >
      {!!sendTxId && (
        <SwapStepAlert
          className="w-100 mb-2"
          show={true}
          type="success"
          title="Bitcoin transaction sent"
          description={`Transaction sent: ${sendTxId}`}
          actionElement={
            <a
              href="#"
              className="swap-step-alert__copy"
              onClick={(e) => {
                e.preventDefault();
                if (sendTxId) navigator.clipboard.writeText(sendTxId);
              }}
            >
              Copy txid
            </a>
          }
        />
      )}
      <div className="mb-2">
        <div className="sc-text">
          Spendable balance: <strong>{spendableBalance?.amount ?? "Loading..."}</strong>
        </div>
        <div className="sc-text">
          Network fee: <strong>{
            networkFeeRate == null
              ? "Loading..."
              : `${networkFeeRate.toFixed(2)} sat/vB`
          }</strong>
        </div>
        <div className="sc-text">
          Estimated tx fee: <strong>{
            estimatedFee == null
              ? "Calculating..."
              : `${estimatedFee} sats (${toHumanReadableString(BigInt(estimatedFee), BitcoinTokens.BTC)} BTC)`
          }</strong>
        </div>
      </div>
      <ValidatedInput
        className="mb-2"
        type="text"
        placeholder="Destination Bitcoin address"
        value={destinationAddress}
        onChange={setDestinationAddress}
        validated={addressParser.validation}
      />
      <ValidatedInput
        className="mb-2"
        type="number"
        placeholder="Amount in BTC"
        value={amount}
        onChange={setAmount}
        min={minimumAmount}
        max={maximumAmount}
        step={stepAmount}
        onValidate={validateAmount}
      />
      {!!sendError && (
        <SwapStepAlert
          className="w-100 mb-2"
          show={true}
          type="error"
          title="Bitcoin transfer error"
          error={sendError}
          actionElement={
            <BaseButton
              variant="secondary"
              onClick={clearSend}
            >
              Dismiss
            </BaseButton>
          }
        />
      )}
      <div className="mt-2 d-flex gap-2">
        <BaseButton variant="secondary" onClick={() => props.close()} className="flex-fill" disabled={sending}>
          Close
        </BaseButton>
        <BaseButton
          variant="primary"
          onClick={send}
          disabled={!canSend || loadingWalletData || sending}
          className="flex-fill"
        >
          {sending && <Spinner size="sm" animation="border" className="me-1"/>}
          {sending ? "Sending..." : "Send"}
        </BaseButton>
      </div>
    </GenericModal>
  );
}
