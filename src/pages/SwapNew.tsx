import {
  fromHumanReadableString,
  isBtcToken,
  isSCToken,
  SCToken,
  SpvFromBTCSwap,
  SwapType,
  Token,
  toTokenAmount,
} from '@atomiqlabs/sdk';
import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SwapsContext } from '../swaps/context/SwapsContext';
import { useAddressData } from '../swaps/hooks/useAddressData';
import ValidatedInput, { numberValidator, ValidatedInputRef } from '../components/ValidatedInput';
import { useAmountConstraints } from '../swaps/hooks/useAmountConstraints';
import { useWalletBalance } from '../wallets/hooks/useWalletBalance';
import { SwapTopbar } from './SwapTopbar';
import { QRScannerModal } from '../qr/QRScannerModal';
import { Alert, Button, Card, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import {
  fromTokenIdentifier,
  getChainIdentifierForCurrency,
  includesToken,
  smartChainTokenArray,
  toTokenIdentifier,
} from '../tokens/Tokens';
import { FEConstants, Tokens } from '../FEConstants';
import BigNumber from 'bignumber.js';
import { CurrencyDropdown } from '../tokens/CurrencyDropdown';
import { SimpleFeeSummaryScreen } from '../fees/SimpleFeeScreen';
import { QuoteSummary } from '../swaps/QuoteSummary';
import { ErrorAlert } from '../components/ErrorAlert';
import { useQuote } from '../swaps/hooks/useQuote';
import { usePricing } from '../tokens/hooks/usePricing';
import { useLocation, useNavigate } from 'react-router-dom';

import Icon from 'react-icons-kit';
import { ic_qr_code_scanner } from 'react-icons-kit/md/ic_qr_code_scanner';
import { lock } from 'react-icons-kit/fa/lock';
import { ic_power_off_outline } from 'react-icons-kit/md/ic_power_off_outline';
import { useExistingSwap } from '../swaps/hooks/useExistingSwap';
import { ConnectedWalletAnchor } from '../wallets/ConnectedWalletAnchor';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { useChain } from '../wallets/hooks/useChain';
import { WebLNProvider } from 'webln';
import { useSupportedTokens } from '../swaps/hooks/useSupportedTokens';
import { useDecimalNumberState } from '../utils/hooks/useDecimalNumberState';
import { ChainDataContext } from '../wallets/context/ChainDataContext';
import { ChainWalletData } from '../wallets/ChainDataProvider';

export function SwapNew(props: { supportedCurrencies: SCToken[] }) {
  const navigate = useNavigate();

  const { swapper } = useContext(SwapsContext);
  const [inputTokens, outputTokens] = useSupportedTokens();

  //Existing swap quote
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const propSwapId = params.get('swapId');
  const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);

  const [isUnlocked, setUnlocked] = useState<boolean>(false);
  const [reversed, setReversed] = useState(false);
  const locked = !isUnlocked && existingSwap != null;

  //Tokens
  const [inputToken, setInputToken] = useStateWithOverride(
    Tokens.BITCOIN.BTC,
    existingSwap?.getInput().token
  );
  const [outputToken, setOutputToken] = useStateWithOverride(
    smartChainTokenArray[0],
    existingSwap?.getOutput().token
  );

  const swapType = useMemo(
    () => swapper?.getSwapType(inputToken, outputToken),
    [swapper, inputToken, outputToken]
  );
  const scCurrency = isSCToken(inputToken)
    ? inputToken
    : isSCToken(outputToken)
      ? outputToken
      : null;

  const inputChainData = useChain(inputToken);
  const outputChainData = useChain(outputToken);
  const {chains, disconnectWallet, connectWallet} = useContext(ChainDataContext);

  //Address
  const addressRef = useRef<ValidatedInputRef>();
  const addressValidator = useCallback(
    (val: string) => {
      if (swapper == null) return null;
      try {
        const addressParseResult = swapper.Utils.parseAddressSync(val);
        if (addressParseResult == null) return 'Invalid address';
      } catch (e) {
        console.log('Address parsing error: ', e);
        return e.message;
      }
      return null;
    },
    [swapper]
  );
  const [address, setAddress] = useState<string>(null);
  let [addressData, addressLoading, addressError] = useAddressData(address, (addressData) => {
    if (addressData?.type == null) return;
    let token: Token;
    switch (addressData.type) {
      case 'BITCOIN':
        token = swapper.getSupportedTokens(false).find((val) => isBtcToken(val) && !val.lightning);
        break;
      case 'LNURL':
        if (addressData.lnurl.type === 'withdraw') {
          navigate('/scan/2?address=' + encodeURIComponent(address));
          return;
        }
      case 'LIGHTNING':
        token = swapper.getSupportedTokens(false).find((val) => isBtcToken(val) && val.lightning);
        break;
      default:
        if (isSCToken(outputToken) && outputToken.chainId === addressData.type) token = outputToken;
        token = swapper
          .getSupportedTokens(false)
          .find((val) => isSCToken(val) && val.chainId === addressData.type);
        break;
    }
    if (outputToken === token) return;
    if (token == null) return 'Address not supported for swaps!';
    const counterTokens = swapper.getSwapCounterTokens(token, false);
    if (counterTokens.length === 0) return 'Address not supported for swaps!';
    const outputChainData: ChainWalletData<any> = chains[getChainIdentifierForCurrency(token)];
    if (
      outputChainData.wallet != null &&
      outputChainData.wallet.address != null &&
      outputChainData.wallet.address !== addressData.address
    ) {
      console.log('SwapNew(): Disconnecting wallet: ' + outputChainData.wallet.name);
      disconnectWallet(outputChainData.chainId);
    }
    console.log('SwapNew(): Using token based on the address: ' + outputToken.ticker);
    setOutputToken(token);
    if (!includesToken(counterTokens, inputToken)) {
      if (includesToken(counterTokens, outputToken)) {
        setInputToken(outputToken);
        setExactIn(!exactIn);
      } else {
        setInputToken(counterTokens[0]);
      }
    }
  });
  if (outputChainData?.wallet?.address != null) {
    addressData = {
      address: outputChainData.wallet.address,
      type: outputChainData.chainId,
      swapType: null,
    };
    addressLoading = false;
    addressError = null;
  }

  const isFixedAmount = addressData?.amount != null;

  //Amounts
  const inputRef = useRef<ValidatedInputRef>();
  const outputRef = useRef<ValidatedInputRef>();
  const [_amount, setAmount] = useDecimalNumberState();
  const amount = isFixedAmount ? addressData.amount.amount : _amount;
  const [exactIn, setExactIn] = useStateWithOverride(true, isFixedAmount ? false : null);
  const { input: swapInputLimits, output: swapOutputLimits } = useAmountConstraints(
    inputToken,
    outputToken
  );

  //Url defined amount & swap type
  useEffect(() => {
    const tokenIn = fromTokenIdentifier(params.get('tokenIn'));
    const tokenOut = fromTokenIdentifier(params.get('tokenOut'));
    if (tokenIn != null) setInputToken(tokenIn);
    if (tokenOut != null) setOutputToken(tokenOut);
    const exactIn = params.get('exactIn');
    const amount = params.get('amount');
    if (exactIn != null && amount != null) {
      setExactIn(exactIn === 'true');
      if (exactIn === 'true') {
        inputRef.current.setValue(amount);
      } else {
        outputRef.current.setValue(amount);
      }
    }
  }, [search]);

  //Gas drop
  const [gasDropChecked, setGasDropChecked] = useStateWithOverride<boolean>(
    false,
    existingSwap instanceof SpvFromBTCSwap
      ? existingSwap.getGasDropOutput().rawAmount > 0
      : undefined
  );
  const gasDropTokenAmount = useMemo(() => {
    if (
      existingSwap != null &&
      existingSwap.getType() === SwapType.SPV_VAULT_FROM_BTC &&
      (existingSwap as SpvFromBTCSwap<any>).getGasDropOutput().rawAmount > 0
    )
      return (existingSwap as SpvFromBTCSwap<any>).getGasDropOutput?.();
    if (swapper != null && isSCToken(outputToken) && swapType === SwapType.SPV_VAULT_FROM_BTC) {
      const nativeToken = swapper.Utils.getNativeToken(outputToken.chainId);
      if (nativeToken.address === outputToken.address) return;
      return toTokenAmount(
        FEConstants.scBalances[toTokenIdentifier(nativeToken)]?.optimal,
        nativeToken,
        swapper.prices
      );
    }
  }, [swapper, existingSwap, swapType, outputToken]);

  //Check native currency balance for gas drop
  useEffect(() => {
    if (addressData?.address == null || swapper == null || gasDropTokenAmount == null) return;
    let cancelled = false;

    swapper.Utils.getSpendableBalance(addressData?.address, gasDropTokenAmount.token).then(
      (value) => {
        if (cancelled) return;
        const requiredBalance =
          FEConstants.scBalances[toTokenIdentifier(gasDropTokenAmount.token)]?.minimum;
        if (value < requiredBalance) {
          setGasDropChecked(true);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [gasDropTokenAmount, addressData?.address, swapper]);

  //Max spendable
  const [minBtcTxFee, setMinBtcTxFee] = useState<number>(null);
  const maxSpendable = useWalletBalance(
    inputToken,
    swapType,
    scCurrency.chainId,
    gasDropTokenAmount != null && gasDropChecked,
    locked,
    minBtcTxFee
  );

  const inputLimits = useMemo(() => {
    if (maxSpendable?.balance == null) return swapInputLimits;
    return {
      min: swapInputLimits.min,
      max: BigNumber.min(swapInputLimits.max, new BigNumber(maxSpendable.balance.amount)),
    };
  }, [swapInputLimits, maxSpendable?.balance?.rawAmount]);
  const outputLimits = useMemo(() => {
    if (addressData?.min == null && addressData?.max == null) return swapOutputLimits;
    return {
      min:
        addressData?.min?.amount == null
          ? swapOutputLimits.min
          : BigNumber.max(new BigNumber(addressData?.min?.amount), swapOutputLimits.min),
      max:
        addressData?.max?.amount == null
          ? swapOutputLimits.max
          : BigNumber.min(new BigNumber(addressData?.max?.amount), swapOutputLimits.max),
    };
  }, [swapOutputLimits, addressData?.min?.amount, addressData?.max?.amount]);
  const inputAmountValidator = useCallback(numberValidator(inputLimits, true), [inputLimits]);
  const outputAmountValidator = useCallback(numberValidator(outputLimits, true), [outputLimits]);
  const validatedAmount = useMemo(() => {
    if ((exactIn ? inputAmountValidator : outputAmountValidator)(amount) == null)
      return amount === '' ? null : new BigNumber(amount).toString(10);
  }, [inputAmountValidator, outputAmountValidator, amount, exactIn]);

  //Quote
  const [refreshQuote, quote, randomQuote, quoteLoading, quoteError] = useQuote(
    validatedAmount,
    exactIn,
    inputToken,
    outputToken,
    addressData?.lnurl ?? addressData?.address,
    gasDropChecked ? gasDropTokenAmount?.rawAmount : undefined,
    maxSpendable?.feeRate,
    addressLoading
  );
  useEffect(() => {
    if (
      quote == null ||
      maxSpendable?.feeRate == null ||
      swapType !== SwapType.SPV_VAULT_FROM_BTC ||
      quote?.getType() !== SwapType.SPV_VAULT_FROM_BTC
    )
      return;
    const quoteMinFee = (quote as SpvFromBTCSwap<any>).minimumBtcFeeRate;
    setMinBtcTxFee(quoteMinFee >= maxSpendable.feeRate ? quoteMinFee : null);
  }, [quote, swapType, maxSpendable?.feeRate]);
  useEffect(() => {
    addressRef.current.validate();
  }, [quote]);

  //Final output/input amounts, value and output address
  const [outputAddress, inputAmount, outputAmount, isOutputWalletAddress] = useMemo(() => {
    if (existingSwap != null)
      return [
        existingSwap.getOutputAddress(),
        existingSwap.getInput().amount,
        existingSwap.getOutput().amount,
        outputChainData?.wallet?.address === existingSwap.getOutputAddress(),
      ];
    let _address = outputChainData?.wallet?.address ?? address;
    if (quote != null)
      return [
        randomQuote ? _address : quote.getOutputAddress(),
        exactIn ? amount : quote.getInput().amount,
        !exactIn ? amount : quote.getOutput().amount,
        outputChainData?.wallet?.address === quote.getOutputAddress(),
      ];
    // if(isFixedAmount) return [_address, "", addressData.amount.amount, outputChainData?.wallet?.address!=null];
    return [
      _address,
      exactIn ? amount : '',
      !exactIn ? amount : '',
      outputChainData?.wallet?.address != null,
    ];
  }, [
    exactIn,
    amount,
    existingSwap,
    quote,
    randomQuote,
    address,
    outputChainData?.wallet?.address,
  ]);
  const notEnoughBalance =
    quote != null &&
    maxSpendable?.balance != null &&
    quote.getInput().rawAmount > maxSpendable.balance.rawAmount;
  const inputValue = usePricing(inputAmount, inputToken);
  const outputValue = usePricing(outputAmount, outputToken);

  //QR scanner
  const [qrScanning, setQrScanning] = useState<boolean>(false);

  //Leaves existing swap
  const leaveExistingSwap = useCallback(
    (noSetAddress?: boolean, noSetAmounts?: boolean) => {
      if (existingSwap == null) return;
      setInputToken(existingSwap.getInput().token);
      setOutputToken(existingSwap.getOutput().token);
      if (!noSetAddress) addressRef.current.setValue(existingSwap.getOutputAddress());
      if (!noSetAmounts)
        if (existingSwap.exactIn) {
          inputRef.current.setValue(existingSwap.getInput().amount);
        } else {
          outputRef.current.setValue(existingSwap.getOutput().amount);
        }
      navigate('/');
    },
    [existingSwap]
  );

  //Changes the direction of the swap, reverses input and output tokens
  const changeDirection = useCallback(() => {
    if (locked || swapper == null) return;
    leaveExistingSwap(true);
    const allowedCounterTokens = swapper.getSwapCounterTokens(inputToken, false);
    if (allowedCounterTokens.length === 0) {
      setInputToken(outputToken);
      const allowedCounterTokens = swapper.getSwapCounterTokens(outputToken, true);
      if (allowedCounterTokens.length === 0) return;
      setOutputToken(allowedCounterTokens[0]);
    } else {
      setOutputToken(inputToken);
      if (includesToken(allowedCounterTokens, outputToken)) {
        setInputToken(outputToken);
      } else {
        setInputToken(allowedCounterTokens[0]);
      }
    }
    setExactIn((val) => !val);
    addressRef.current.setValue('');
  }, [inputToken, outputToken, leaveExistingSwap, swapper, locked]);

  const webLnForOutput =
    existingSwap == null &&
    outputChainData?.chain?.name === 'Lightning' &&
    outputChainData?.wallet != null;
  useEffect(() => {
    if (!webLnForOutput) return;
    if (exactIn) {
      inputRef.current.setValue('');
      setExactIn(false);
    }
    addressRef.current.setValue('');
  }, [webLnForOutput]);

  //Don't lock output amounts when WebLN wallet is connected
  const amountsLocked = webLnForOutput ? false : isFixedAmount;

  const setAmountLock = useCallback(
    (val: boolean) => {
      if (existingSwap == null) {
        if (val) {
          console.log(
            'SwapNew: setAmountLock, locking swap and redirecting to swap: ' + quote.getId()
          );
          setUnlocked(false);
          navigate('/?swapId=' + quote.getId());
        } else {
          navigate('/');
        }
      } else {
        setUnlocked(!val);
      }
    },
    [quote, existingSwap]
  );

  //Show "Use external wallet" when amount is too high
  const showUseExternalWallet = useMemo(() => {
    if (maxSpendable?.balance == null || swapper == null) return false;
    if (swapper.SwapTypeInfo[swapType].requiresInputWallet) return false;
    const parsedAmount = new BigNumber(inputAmount);
    const balance = new BigNumber(maxSpendable.balance.amount);
    return (
      parsedAmount.gt(balance) &&
      (swapInputLimits?.max == null || parsedAmount.lte(swapInputLimits.max))
    );
  }, [swapper, maxSpendable?.balance, inputAmount, swapInputLimits?.max, swapType]);

  return (
    <>
      {/* TODO remove, maybe it will be inspiration in the future */}
      {/*<SwapTopbar selected={0} enabled={!locked} />*/}

      <QRScannerModal
        onScanned={(data: string) => {
          console.log('QR scanned: ', data);
          addressRef.current.setValue(data);
          setQrScanning(false);
        }}
        show={qrScanning}
        onHide={() => setQrScanning(false)}
      />

      <div className="d-flex flex-column align-items-center text-white">
        <div className="swap-panel">
          <ErrorAlert title="Quote error" error={quoteError} className="swap-panel__error" />
          <div className="swap-panel__card">
            <div className="swap-panel__card__header">
              <div className="swap-panel__card__title">You pay</div>

              {maxSpendable != null ? (
                <div className="swap-connected-wallet">
                  <div className="swap-panel__card__wallet">
                    <ConnectedWalletAnchor
                      noText={false}
                      simple={true}
                      currency={inputToken}
                      variantButton="clear"
                      maxSpendable={maxSpendable}
                    />
                  </div>
                  {/* TODO implement this */}
                  {/*<Button*/}
                  {/*  variant="outline-light"*/}
                  {/*  style={{ marginBottom: '2px' }}*/}
                  {/*  className="py-0 px-1"*/}
                  {/*  disabled={locked || amountsLocked}*/}
                  {/*  onClick={() => {*/}
                  {/*    setExactIn(true);*/}
                  {/*    inputRef.current.setValue(maxSpendable?.balance?.amount);*/}
                  {/*  }}*/}
                  {/*>*/}
                  {/*  <small className="font-smallest" style={{ marginBottom: '-2px' }}>*/}
                  {/*    MAX*/}
                  {/*  </small>*/}
                  {/*</Button>*/}
                </div>
              ) : (
                <div className="swap-panel__card__wallet">
                  <ConnectedWalletAnchor
                    noText={false}
                    simple={true}
                    currency={inputToken}
                    maxSpendable={maxSpendable}
                    variantButton="clear"
                  />
                </div>
              )}
            </div>
            <div className="swap-panel__card__body">
              <CurrencyDropdown
                currencyList={inputTokens}
                onSelect={(val) => {
                  if (locked) return;
                  leaveExistingSwap();
                  const supportedCounterTokens = swapper.getSwapCounterTokens(val, true);
                  setInputToken(val);
                  if (includesToken(supportedCounterTokens, outputToken)) return;
                  let newOutputToken: Token;
                  if (includesToken(supportedCounterTokens, inputToken)) {
                    newOutputToken = inputToken;
                    setExactIn(!exactIn);
                  } else {
                    if (isSCToken(outputToken))
                      newOutputToken = supportedCounterTokens.find(
                        (val) => isSCToken(val) && val.chainId === outputToken.chainId
                      );
                    newOutputToken ??= supportedCounterTokens[0];
                    if (newOutputToken == null) {
                      setInputToken(inputToken);
                      return;
                    }
                  }
                  setOutputToken(newOutputToken);
                  if (
                    getChainIdentifierForCurrency(newOutputToken) !==
                    getChainIdentifierForCurrency(outputToken)
                  )
                    addressRef.current.setValue('');
                }}
                value={inputToken}
                className="round-right text-white bg-black bg-opacity-10"
              />
              <ValidatedInput
                disabled={locked || amountsLocked || webLnForOutput}
                inputRef={inputRef}
                className="swap-panel__input-wrapper"
                placeholder={'0.00'}
                type="number"
                value={inputAmount}
                size={'lg'}
                textStart={
                  !exactIn && quoteLoading ? <Spinner size="sm" className="text-white" /> : null
                }
                onChange={(value, forcedChange) => {
                  setAmount(value);
                  setExactIn(true);
                  if (!forcedChange) leaveExistingSwap(false, true);
                }}
                inputId="amount-input"
                inputClassName="swap-panel__input"
                floatingLabelClassName="swap-panel__label"
                floatingLabel={FEConstants.USDollar.format(inputValue ?? 0)}
                expectingFloatingLabel={true}
                step={
                  inputToken == null
                    ? new BigNumber('0.00000001')
                    : new BigNumber(10).pow(
                        new BigNumber(-(inputToken.displayDecimals ?? inputToken.decimals))
                      )
                }
                min={inputLimits?.min}
                max={inputLimits?.max}
                onValidate={inputAmountValidator}
                feedbackEndElement={
                  showUseExternalWallet ? (
                    <a
                      className="ms-auto"
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if(inputChainData==null) return;
                        disconnectWallet(inputChainData.chainId);
                      }}
                    >
                      Use external wallet
                    </a>
                  ) : null
                }
                validated={
                  notEnoughBalance
                    ? 'Not enough balance'
                    : (!exactIn && quote != null) || existingSwap != null
                      ? null
                      : undefined
                }
              />
            </div>
          </div>
          <div className="swap-panel__toggle">
            <Button
              onClick={() => {
                if (locked) return;
                setReversed((v) => !v);
                changeDirection();
              }}
              size="lg"
              className="swap-panel__toggle__button"
              style={{
                transition: 'transform 0.35s ease',
                transform: reversed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <div className="icon icon-swap"></div>
            </Button>
          </div>
          <div className="swap-panel__card">
            <div className="swap-panel__card__header">
              <div className="swap-panel__card__title">You receive</div>
              <div className="swap-panel__card__wallet">
                <ConnectedWalletAnchor
                  noText={false}
                  simple={true}
                  currency={outputToken}
                  variantButton="clear"
                />
              </div>
            </div>
            <div className="swap-panel__card__body">
              <CurrencyDropdown
                currencyList={outputTokens}
                onSelect={(val) => {
                  if (locked) return;
                  leaveExistingSwap();
                  if (val === outputToken) return;
                  if (
                    getChainIdentifierForCurrency(val) !==
                    getChainIdentifierForCurrency(outputToken)
                  )
                    addressRef.current.setValue('');
                  const supportedCounterTokens = swapper.getSwapCounterTokens(val, false);
                  setOutputToken(val);
                  if (includesToken(supportedCounterTokens, inputToken)) return;
                  if (includesToken(supportedCounterTokens, outputToken)) {
                    setInputToken(outputToken);
                    setExactIn(!exactIn);
                  } else {
                    let token: Token;
                    if (isSCToken(inputToken))
                      token = supportedCounterTokens.find(
                        (val) => isSCToken(val) && val.chainId === inputToken.chainId
                      );
                    token ??= supportedCounterTokens[0];
                    if (token == null) {
                      setOutputToken(outputToken);
                      return;
                    }
                    setInputToken(token);
                  }
                }}
                value={outputToken}
                className="round-right text-white bg-black bg-opacity-10"
              />
              <ValidatedInput
                disabled={locked || amountsLocked}
                inputRef={outputRef}
                className="flex-fill strip-group-text"
                type="number"
                value={outputAmount}
                size={'lg'}
                textStart={
                  exactIn && quoteLoading ? <Spinner size="sm" className="text-white" /> : null
                }
                onChange={(val, forcedChange) => {
                  setAmount(val);
                  setExactIn(false);
                  if (webLnForOutput) addressRef.current.setValue('');
                  if (!forcedChange) leaveExistingSwap(webLnForOutput, true);
                }}
                inputId="amount-output"
                inputClassName="swap-panel__input"
                floatingLabelClassName="swap-panel__label"
                placeholder={'0.00'}
                floatingLabel={FEConstants.USDollar.format(outputValue ?? 0)}
                expectingFloatingLabel={true}
                step={
                  outputToken == null
                    ? new BigNumber('0.00000001')
                    : new BigNumber(10).pow(
                        new BigNumber(-(outputToken.displayDecimals ?? outputToken.decimals))
                      )
                }
                min={outputLimits?.min}
                max={outputLimits?.max}
                onValidate={outputAmountValidator}
                validated={(exactIn && quote != null) || existingSwap != null ? null : undefined}
              />
            </div>
            <div className={gasDropTokenAmount != null ? 'd-flex' : 'd-none'}>
              <ValidatedInput
                type={'checkbox'}
                className="swap-panel__input-wrapper"
                onChange={(val: boolean) => {
                  setGasDropChecked(val);
                  leaveExistingSwap();
                }}
                placeholder={
                  <span>
                    <OverlayTrigger
                      overlay={
                        <Tooltip id={'fee-tooltip-gas-drop'}>
                          <span>
                            Swap some amount of BTC to {gasDropTokenAmount?.token.ticker} (gas token
                            on the destination chain), so that you can transact on{' '}
                            {gasDropTokenAmount?.token.chainId}
                          </span>
                        </Tooltip>
                      }
                    >
                      <span className="dottedUnderline">
                        Request gas drop of {gasDropTokenAmount?._amount.toString(10)}{' '}
                        {gasDropTokenAmount?.token.ticker}
                      </span>
                    </OverlayTrigger>
                  </span>
                }
                value={gasDropChecked}
                onValidate={() => null}
                disabled={locked}
              />
            </div>
            <div
              className={
                'flex-column ' +
                (swapper == null || swapper?.SwapTypeInfo[swapType].requiresOutputWallet
                  ? 'd-none'
                  : 'd-flex')
              }
            >
              <ValidatedInput
                type={'text'}
                className={
                  'flex-fill mt-3 ' +
                  (webLnForOutput && addressData?.address == null ? 'd-none' : '')
                }
                onChange={(val, forcedChange) => {
                  setAddress(val);
                  if (!forcedChange) leaveExistingSwap(true);
                }}
                value={outputAddress}
                inputRef={addressRef}
                placeholder={'Destination wallet address'}
                onValidate={addressValidator}
                validated={
                  isOutputWalletAddress || outputAddress !== address ? null : addressError?.message
                }
                disabled={locked || outputChainData?.wallet != null}
                feedbackEndElement={
                  outputChainData?.wallet == null ? (
                    <a
                      className="ms-auto"
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if(outputChainData==null) return;
                        connectWallet(outputChainData.chainId);
                      }}
                    >
                      Connect wallet
                    </a>
                  ) : null
                }
                textStart={addressLoading ? <Spinner size="sm" className="text-white" /> : null}
                textEnd={
                  locked ? null : outputChainData?.wallet != null ? (
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
                        style={{
                          marginTop: '-3px',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          if(outputChainData==null) return;
                          disconnectWallet(outputChainData.chainId);
                        }}
                      >
                        <Icon size={24} icon={ic_power_off_outline} />
                      </a>
                    </OverlayTrigger>
                  ) : (
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id="scan-qr-tooltip">Scan QR code</Tooltip>}
                    >
                      <a
                        href="#"
                        style={{
                          marginTop: '-3px',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          setQrScanning(true);
                        }}
                      >
                        <Icon size={24} icon={ic_qr_code_scanner} />
                      </a>
                    </OverlayTrigger>
                  )
                }
                successFeedback={
                  isOutputWalletAddress
                    ? 'Address fetched from your ' + outputChainData?.wallet.name + ' wallet!'
                    : null
                }
              />
              {webLnForOutput ? (
                <>
                  {addressData?.address == null && validatedAmount != null ? (
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

              <Alert
                variant={'success'}
                className="mt-3 mb-0 text-center"
                show={
                  !locked &&
                  outputChainData?.wallet == null &&
                  isBtcToken(outputToken) &&
                  outputToken.lightning &&
                  addressData == null
                }
              >
                <label>
                  Only lightning invoices with pre-set amount are supported! Use lightning
                  address/LNURL for variable amount.
                </label>
              </Alert>
            </div>
          </div>
          {quoteError != null ? (
            <Button variant="light" className="mt-3" onClick={refreshQuote}>
              Retry
            </Button>
          ) : (
            ''
          )}
          {quote != null || existingSwap != null ? (
            <>
              <div className="mt-3">
                <SimpleFeeSummaryScreen
                  swap={existingSwap ?? quote}
                  btcFeeRate={inputToken.chain === 'BTC' ? maxSpendable?.feeRate : null}
                />
              </div>
              {!randomQuote || swapper.SwapTypeInfo[swapType].requiresOutputWallet ? (
                <div className="mt-3 d-flex flex-column text-white">
                  <QuoteSummary
                    type="swap"
                    quote={existingSwap ?? quote}
                    balance={maxSpendable?.balance.rawAmount ?? null}
                    refreshQuote={() => {
                      if (existingSwap != null) {
                        leaveExistingSwap(false, true);
                        setExactIn(existingSwap.exactIn);
                        if (existingSwap.exactIn) {
                          setAmount(existingSwap.getInput().amount);
                        } else {
                          setAmount(existingSwap.getOutput().amount);
                        }
                      }
                      refreshQuote();
                    }}
                    setAmountLock={setAmountLock}
                    abortSwap={() => {
                      inputRef.current.setValue('');
                      outputRef.current.setValue('');
                      navigate('/');
                    }}
                    feeRate={maxSpendable?.feeRate}
                  />
                </div>
              ) : (
                ''
              )}
            </>
          ) : (
            ''
          )}
        </div>
      </div>

      <div className="mt-4 text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3">
        <div
          className="cursor-pointer d-flex align-items-center justify-content-center"
          onClick={() => navigate('/faq?tabOpen=6')}
        >
          <Icon size={18} icon={lock} style={{ marginTop: '-0.5rem' }} />
          <small>Audited by</small>
          {scCurrency?.chainId === 'STARKNET' ? (
            <img
              className="d-block ms-1"
              height={18}
              src="/csc-white-logo.png"
              style={{ marginTop: '-0.075rem', opacity: 0.6 }}
            />
          ) : (
            <img
              className="opacity-50 d-block ms-1"
              height={18}
              src="/ackee_blockchain.svg"
              style={{ marginTop: '-0.125rem' }}
            />
          )}
        </div>
      </div>
    </>
  );
}
