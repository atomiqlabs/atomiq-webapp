import ValidatedInput, { numberValidator } from '../../components/ValidatedInput';
import { TokensDropdown } from '../../components/tokens/TokensDropdown';
import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FeeSummaryScreen } from '../../components/fees/FeeSummaryScreen';
import { Badge, Button, Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { SCToken, SwapType } from '@atomiqlabs/sdk';
import BigNumber from 'bignumber.js';
import { smartChainTokenArray } from '../../utils/Tokens';
import { useLocation, useNavigate } from 'react-router-dom';
import { SwapTopbar } from '../SwapTopbar';
import { SwapperContext } from '../../context/SwapperContext';
import { TokenIcon } from '../../components/tokens/TokenIcon';
import { useAddressData } from '../../hooks/quoting/useAddressData';
import { useAmountConstraints } from '../../hooks/quoting/useAmountConstraints';
import { useQuote } from '../../hooks/quoting/useQuote';
import { useWalletBalance } from '../../hooks/wallets/useWalletBalance';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { useLocalStorage } from '../../hooks/utils/useLocalStorage';
import { ErrorAlert } from '../../components/_deprecated/ErrorAlert';
import { Tokens } from '../../FEConstants';
import { useStateWithOverride } from '../../hooks/utils/useStateWithOverride';
import {SwapPanel} from "../../components/swappanels/SwapPanel";

export function QuickScanExecute() {
  const { swapper } = useContext(SwapperContext);

  const navigate = useNavigate();
  const goBack = () => navigate('/scan');

  const { search } = useLocation() as { search: string };
  const params = new URLSearchParams(search);
  const propAddress = params.get('address') || params.get('lightning');
  useEffect(() => {
    if (propAddress == null) goBack();
  }, [propAddress]);

  const [isLocked, setLocked] = useState<boolean>(false);
  const [selectedCurrency, setSelectedCurrency] = useState<SCToken>(null);
  const [isCurrencyPreselected, setCurrencyPreselected] = useState<boolean>(false);

  useEffect(() => {
    const propToken = params.get('token');
    const propChainId = params.get('chainId');
    if (propToken != null && propChainId != null) {
      setSelectedCurrency(Tokens[propChainId][propToken]);
      setCurrencyPreselected(true);
    }
  }, []);

  const [autoContinue, setAutoContinue] = useLocalStorage('crossLightning-autoContinue', false);

  const [addressResult, addressLoading, addressError] = useAddressData(propAddress);
  const inToken =
    addressResult?.swapType == null
      ? null
      : addressResult.swapType === SwapType.FROM_BTCLN
        ? Tokens.BITCOIN.BTCLN
        : selectedCurrency;
  const outToken =
    addressResult?.swapType == null
      ? null
      : addressResult.swapType === SwapType.TO_BTCLN
        ? Tokens.BITCOIN.BTCLN
        : addressResult.swapType === SwapType.TO_BTC
          ? Tokens.BITCOIN.BTC
          : selectedCurrency;
  const [amount, setAmount] = useStateWithOverride(null, addressResult?.amount?.amount);

  const exactIn =
    addressResult?.swapType === SwapType.FROM_BTCLN ||
    addressResult?.swapType === SwapType.FROM_BTC ||
    addressResult?.swapType === SwapType.SPV_VAULT_FROM_BTC;
  const btcToken = (exactIn ? inToken : outToken) ?? Tokens.BITCOIN.BTC;

  const { input: inputLimit, output: outputLimit } = useAmountConstraints(inToken, outToken);
  const btcConstraints = exactIn ? inputLimit : outputLimit;
  const amountConstraints = useMemo(() => {
    return {
      min: BigNumber.max(btcConstraints?.min ?? 0, new BigNumber(addressResult?.min?.amount) ?? 0),
      max: BigNumber.min(
        btcConstraints?.max ?? Infinity,
        new BigNumber(addressResult?.max?.amount) ?? Infinity
      ),
    };
  }, [btcConstraints, addressResult]);
  const amountValidator = useCallback(numberValidator(amountConstraints, true), [
    amountConstraints,
  ]);
  const validatedAmount = useMemo(() => {
    if (amountValidator(amount) == null)
      return amount === '' ? null : new BigNumber(amount).toString(10);
  }, [amount]);

  const [refresh, quote, _, quoteLoading, quoteError] = useQuote(
    validatedAmount,
    exactIn,
    inToken,
    outToken,
    addressResult?.lnurl ?? addressResult?.address
  );

  const selectableCurrencies = useMemo(() => {
    if (swapper == null) return smartChainTokenArray;
    return swapper.getSwapCounterTokens(btcToken, exactIn);
  }, [swapper, exactIn, btcToken]);

  const walletBalanceResp = useWalletBalance(inToken, addressResult?.swapType);
  const walletBalance = walletBalanceResp?.balance?.rawAmount ?? null;

  return (
    <>
      <SwapTopbar selected={1} enabled={!isLocked} />

      <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
        <div className="quickscan-summary-panel d-flex flex-column flex-fill">
          <div className="p-3 d-flex flex-column tab-bg border-0 card">
            <ValidatedInput
              type={'text'}
              className=""
              disabled={true}
              value={addressResult?.address ?? propAddress}
            />

            <ErrorAlert className="mt-3" title="Destination parsing error" error={addressError} />

            {addressLoading ? (
              <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                <Spinner animation="border" />
                Loading data...
              </div>
            ) : (
              ''
            )}

            {addressError == null && swapper != null && !addressLoading ? (
              <div className="mt-3 tab-accent-p3 text-center">
                <label className="fw-bold mb-1">{!exactIn ? 'Pay' : 'Withdraw'}</label>

                <ValidatedInput
                  type={'number'}
                  textEnd={
                    <span className="text-white font-bigger d-flex align-items-center">
                      <TokenIcon tokenOrTicker={btcToken} className="currency-icon" />
                      BTC
                    </span>
                  }
                  step={new BigNumber(10).pow(new BigNumber(-btcToken.decimals))}
                  min={amountConstraints.min}
                  max={amountConstraints.max}
                  onValidate={amountValidator}
                  disabled={addressResult?.amount != null || isLocked}
                  size={'lg'}
                  defaultValue={
                    addressResult?.type !== 'LNURL'
                      ? null
                      : !exactIn
                        ? amountConstraints.min.toString(10)
                        : amountConstraints.max.toString(10)
                  }
                  value={amount}
                  onChange={(val) => {
                    setAmount(val);
                  }}
                  placeholder={'Input amount'}
                />

                <label className="fw-bold mb-1">{!exactIn ? 'with' : 'to'}</label>

                <div className="d-flex justify-content-center">
                  <TokensDropdown
                    tokensList={selectableCurrencies}
                    onSelect={(val) => {
                      if (isLocked) return;
                      setSelectedCurrency(val as SCToken);
                      setCurrencyPreselected(false);
                    }}
                    value={selectedCurrency}
                    className="bg-black bg-opacity-10 text-white"
                  />
                </div>

                <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-2">
                  <Form.Check // prettier-ignore
                    id="autoclaim-pay"
                    type="switch"
                    onChange={(val) => setAutoContinue(val.target.checked)}
                    checked={autoContinue}
                  />
                  <label title="" htmlFor="autoclaim-pay" className="form-check-label me-2">
                    {!exactIn ? 'Auto-pay' : 'Auto-claim'}
                  </label>
                  <OverlayTrigger
                    overlay={
                      <Tooltip id="autoclaim-pay-tooltip">
                        Automatically requests authorization of the transaction through your wallet
                        - as soon as the swap pricing is returned.
                      </Tooltip>
                    }
                  >
                    <Badge bg="primary" className="pill-round" pill>
                      ?
                    </Badge>
                  </OverlayTrigger>
                </Form>
              </div>
            ) : (
              ''
            )}

            {quoteLoading ? (
              <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                <Spinner animation="border" />
                Fetching quote...
              </div>
            ) : (
              ''
            )}

            {quoteError ? (
              <>
                <ErrorAlert className="my-3" title="Quoting error" error={quoteError} />
                <Button onClick={refresh} variant="secondary">
                  Retry
                </Button>
              </>
            ) : (
              ''
            )}

            {quote != null ? (
              <>
                <FeeSummaryScreen swap={quote} className="mt-3 mb-3 tab-accent" />
                <SwapPanel
                  UICallback={() => {}}
                  type={'payment'}
                  quote={quote}
                  balance={walletBalance}
                  refreshQuote={refresh}
                  autoContinue={
                    autoContinue && (!isCurrencyPreselected || addressResult?.amount != null)
                  }
                />
              </>
            ) : (
              ''
            )}

            <ScrollAnchor trigger={quote != null} />
          </div>
          <div className="d-flex mt-auto py-4">
            <Button variant="secondary flex-fill" disabled={isLocked} onClick={goBack}>
              &lt; Back
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
