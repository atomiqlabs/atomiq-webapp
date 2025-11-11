import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SwapsContext } from '../swaps/context/SwapsContext';
import { useSupportedTokens } from '../swaps/hooks/useSupportedTokens';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { FEConstants, Tokens } from '../FEConstants';
import {
  fromTokenIdentifier,
  getChainIdentifierForCurrency,
  includesToken,
  smartChainTokenArray,
  toTokenIdentifier,
} from '../tokens/Tokens';
import {
  fromHumanReadableString,
  isBtcToken,
  isSCToken,
  ISwap,
  SCToken,
  SpvFromBTCSwap,
  SwapType,
  ToBTCLNSwap,
  Token,
  TokenAmount,
  toTokenAmount,
} from '@atomiqlabs/sdk';
import { useChain } from '../wallets/hooks/useChain';
import { ChainDataContext } from '../wallets/context/ChainDataContext';
import { useAddressData } from '../swaps/hooks/useAddressData';
import { ChainWalletData } from '../wallets/ChainDataProvider';
import { useDecimalNumberState } from '../utils/hooks/useDecimalNumberState';
import { useAmountConstraints } from '../swaps/hooks/useAmountConstraints';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletBalance } from '../wallets/hooks/useWalletBalance';
import BigNumber from 'bignumber.js';
import { numberValidator } from '../components/ValidatedInput';
import { useQuote } from '../swaps/hooks/useQuote';
import { usePricing } from '../tokens/hooks/usePricing';
import { WebLNProvider } from 'webln';
import { useExistingSwap } from '../swaps/hooks/useExistingSwap';

export type SwapPageUIState = 'show' | 'lock' | 'hide';

export type SwapPageState = {
  input: {
    wallet?: {
      data: ChainWalletData<any>['wallet'];
      spendable?: TokenAmount;
      btcFeeRate?: number;
      disconnect: () => void;
    };
    token: {
      value: Token;
      values: Token[];
      onChange: (val: Token) => void;
      disabled: boolean;
    };
    amount: {
      value: string;
      valueUsd?: string;
      onChange: (val: string) => void;
      disabled: boolean;
      loading: boolean;
      step: BigNumber;
      min: BigNumber;
      max: BigNumber;
      validation?: {
        status: 'success' | 'warning' | 'error';
        text: string;
      };
    };
    chainId: string;
    useExternalWallet?: () => void;
  };
  changeDirection: () => void;
  output: {
    wallet?: {
      data: ChainWalletData<any>['wallet'];
      balance?: TokenAmount;
      disconnect: () => void;
    };
    token: {
      value: Token;
      values: Token[];
      onChange: (val: Token) => void;
      disabled: boolean;
    };
    amount: {
      value: string;
      valueUsd?: string;
      onChange: (val: string) => void;
      disabled: boolean;
      loading: boolean;
      step: BigNumber;
      min: BigNumber;
      max: BigNumber;
      validation?: {
        status: 'success' | 'warning' | 'error';
        text: string;
      };
      isFromAddress: boolean;
    };
    chainId: string;
    gasDrop?: {
      checked: boolean;
      onChange: (checked: boolean) => void;
      amount: TokenAmount<string, SCToken>;
      disabled: boolean;
    };
    address?: {
      value: string;
      onChange: (val: string) => void;
      disabled: boolean;
      loading: boolean;
      validation?: {
        status: 'success' | 'warning' | 'error';
        text: string;
      };
      isFromWallet: boolean;
    };
    webln?: {
      fetchInvoice?: () => void;
    };
    showLightningAlert: boolean;
  };
  smartChainId: string;
  swapType: SwapType;
  swapTypeData?: {
    requiresInputWallet: boolean;
    requiresOutputWallet: boolean;
    supportsGasDrop: boolean;
  };
  quote: {
    loading: boolean;
    quote?: ISwap;
    isRandom?: boolean;
    error?: Error;
    refresh: () => void;
    abort: () => void;
    UICallback: (quote: ISwap, status: SwapPageUIState) => void;
  };
  hideUI: boolean;
};

export function useSwapPage(): SwapPageState {
  const { chains, disconnectWallet, connectWallet } = useContext(ChainDataContext);
  const { swapper } = useContext(SwapsContext);

  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const propSwapId = params.get('swapId');
  const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);

  const [inputTokens, outputTokens] = useSupportedTokens();

  //Tokens
  const [inputToken, _setInputToken] = useState<Token>(Tokens.BITCOIN.BTC);
  const [outputToken, _setOutputToken] = useState<Token>(smartChainTokenArray[0]);
  const swapType = useMemo(
    () => swapper?.getSwapType(inputToken, outputToken),
    [swapper, inputToken, outputToken]
  );
  const swapTypeData = useMemo(() => swapper?.SwapTypeInfo[swapType], [swapper, swapType]);
  const scCurrency = isSCToken(inputToken)
    ? inputToken
    : isSCToken(outputToken)
      ? outputToken
      : null;

  const inputChainData = useChain(inputToken);
  const outputChainData = useChain(outputToken);

  const inputTokenStep = useMemo(() => {
    if (inputToken == null) return new BigNumber('0.00000001');
    return new BigNumber(10).pow(
      new BigNumber(-(inputToken.displayDecimals ?? inputToken.decimals))
    );
  }, [inputToken]);
  const outputTokenStep = useMemo(() => {
    if (outputToken == null) return new BigNumber('0.00000001');
    return new BigNumber(10).pow(
      new BigNumber(-(outputToken.displayDecimals ?? outputToken.decimals))
    );
  }, [outputToken]);

  //Address
  const [addressFromWebLn, setAddressFromWebLn] = useState<string>(null);
  const [_address, setAddress] = useState<string>(null);
  const address = outputChainData?.wallet?.address ?? _address;
  const [addressData, addressLoading, addressError] = useAddressData(address, (addressData) => {
    if (addressData?.type == null) return;
    let token: Token;
    switch (addressData.type) {
      case 'BITCOIN':
        token = swapper.getSupportedTokens(false).find((val) => isBtcToken(val) && !val.lightning);
        break;
      case 'LNURL':
        if (addressData.lnurl.type === 'withdraw') {
          //TODO: Navigate to scan!
          //navigate('/scan/2?address=' + encodeURIComponent(address));
          return;
        }
      case 'LIGHTNING':
        token = swapper.getSupportedTokens(false).find((val) => isBtcToken(val) && val.lightning);
        break;
      default:
        if (isSCToken(outputToken) && outputToken.chainId === addressData.type) {
          token = outputToken;
        } else {
          token = swapper
            .getSupportedTokens(false)
            .find((val) => isSCToken(val) && val.chainId === addressData.type);
        }
        break;
    }
    if (outputToken === token) return;
    if (token == null) return 'Address not supported for swaps!';
    const counterTokens = swapper.getSwapCounterTokens(token, false);
    if (counterTokens.length === 0) return 'Address not supported for swaps!';
    const outputChainData: ChainWalletData<any> = chains[getChainIdentifierForCurrency(token)];
    //This handles the case when the chain to be switched to already has a wallet connected,
    // a connected wallet would block the address from being used, therefore the wallet
    // is disconnected here
    if (
      outputChainData.wallet != null &&
      outputChainData.wallet.address != null &&
      outputChainData.wallet.address !== addressData.address
    ) {
      console.log('SwapNew(): Disconnecting wallet: ' + outputChainData.wallet.name);
      disconnectWallet(outputChainData.chainId);
    }
    console.log('SwapNew(): Using token based on the address: ' + outputToken.ticker);
    setOutputToken(token, false);
  });
  const isFixedAmount = addressData?.amount != null;

  //Amounts
  const [_amount, setAmount] = useDecimalNumberState('');
  const amount = isFixedAmount ? addressData.amount.amount : _amount;
  const [exactIn, setExactIn] = useStateWithOverride(true, isFixedAmount ? false : null);
  const { input: swapInputLimits, output: swapOutputLimits } = useAmountConstraints(
    inputToken,
    outputToken
  );

  //Tokens setters
  const setInputToken = useCallback(
    (val: Token) => {
      const supportedCounterTokens = swapper.getSwapCounterTokens(val, true);
      _setInputToken(val);
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
      _setOutputToken(newOutputToken);
      if (
        getChainIdentifierForCurrency(newOutputToken) !== getChainIdentifierForCurrency(outputToken)
      )
        setAddress('');
    },
    [swapper, outputToken, inputToken, exactIn]
  );
  const setOutputToken = useCallback(
    (val: Token, resetAddress: boolean = true) => {
      if (val === outputToken) return;
      if (resetAddress && getChainIdentifierForCurrency(val) !== getChainIdentifierForCurrency(outputToken))
        setAddress('');
      const supportedCounterTokens = swapper.getSwapCounterTokens(val, false);
      _setOutputToken(val);
      if (includesToken(supportedCounterTokens, inputToken)) return;
      if (includesToken(supportedCounterTokens, outputToken)) {
        _setInputToken(outputToken);
        setExactIn(!exactIn);
      } else {
        let token: Token;
        if (isSCToken(inputToken))
          token = supportedCounterTokens.find(
            (val) => isSCToken(val) && val.chainId === inputToken.chainId
          );
        token ??= supportedCounterTokens[0];
        if (token == null) {
          _setOutputToken(outputToken);
          return;
        }
        _setInputToken(token);
      }
    },
    [swapper, outputToken, inputToken, exactIn]
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
      setAmount(amount);
    }
  }, [search]);

  //Gas drop
  const [gasDropChecked, setGasDropChecked] = useState<boolean>(false);
  const gasDropTokenAmount = useMemo(() => {
    if (swapper != null && swapTypeData?.supportsGasDrop) {
      const nativeToken = swapper.Utils.getNativeToken(scCurrency.chainId);
      if (nativeToken.address === scCurrency.address) return;
      return toTokenAmount(
        FEConstants.scBalances[toTokenIdentifier(nativeToken)]?.optimal,
        nativeToken,
        swapper.prices
      );
    }
  }, [swapper, swapTypeData, scCurrency]);

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
    false,
    minBtcTxFee
  );

  // Output wallet balance for display
  const outputMaxSpendable = useWalletBalance(outputToken, swapType);

  //Swap limits
  const inputLimits = useMemo(() => {
    if (maxSpendable?.balance == null) return swapInputLimits;
    const maxSpendableBigNum = new BigNumber(maxSpendable.balance.amount);
    return {
      min: swapInputLimits.min,
      max:
        swapInputLimits.max == null
          ? maxSpendableBigNum
          : BigNumber.min(swapInputLimits.max, maxSpendableBigNum),
    };
  }, [swapInputLimits, maxSpendable]);
  const inputAmountValidator = useCallback(numberValidator(inputLimits, true), [inputLimits]);

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
  const outputAmountValidator = useCallback(numberValidator(outputLimits, true), [outputLimits]);

  const [validatedAmount, amountError] = useMemo(() => {
    const error = (exactIn ? inputAmountValidator : outputAmountValidator)(amount);
    return [amount === '' || error != null ? null : new BigNumber(amount).toString(10), error];
  }, [inputAmountValidator, outputAmountValidator, amount, exactIn]);

  //WebLN
  const webLnForOutput =
    outputChainData?.chain?.name === 'Lightning' && outputChainData?.wallet != null;
  useEffect(() => {
    if (!webLnForOutput) return;
    if (exactIn) {
      setAmount('');
      setExactIn(false);
    }
    setAddress('');
  }, [webLnForOutput]);

  //Quote
  const [refreshQuote, _quote, randomQuote, quoteLoading, quoteError] = useQuote(
    validatedAmount,
    exactIn,
    inputToken,
    outputToken,
    addressData?.lnurl ?? addressData?.address,
    gasDropChecked ? gasDropTokenAmount?.rawAmount : undefined,
    maxSpendable?.feeRate,
    addressLoading || !!existingSwap
  );
  const quote = existingSwap ?? _quote;
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

  //Final output/input amounts, value and output address
  const [outputAddress, inputAmount, outputAmount, isOutputWalletAddress] = useMemo(() => {
    if (quote != null)
      return [
        randomQuote ? address : quote.getOutputAddress(),
        exactIn ? amount : quote.getInput().amount,
        !exactIn ? amount : quote.getOutput().amount,
        (outputChainData?.wallet?.address ?? addressFromWebLn) === quote.getOutputAddress(),
      ];
    // if(isFixedAmount) return [_address, "", addressData.amount.amount, outputChainData?.wallet?.address!=null];
    return [
      address,
      exactIn ? amount : '',
      !exactIn ? amount : '',
      outputChainData?.wallet?.address != null || webLnForOutput,
    ];
  }, [
    exactIn,
    amount,
    quote,
    randomQuote,
    address,
    outputChainData?.wallet?.address,
    addressFromWebLn,
    webLnForOutput,
  ]);
  const notEnoughBalance =
    quote != null &&
    maxSpendable?.balance != null &&
    quote.getInput().rawAmount > maxSpendable.balance.rawAmount;
  const inputValue = usePricing(inputAmount, inputToken);
  const outputValue = usePricing(outputAmount, outputToken);

  //Changes the direction of the swap, reverses input and output tokens
  const changeDirection = useCallback(() => {
    if (swapper == null) return;
    const allowedCounterTokens = swapper.getSwapCounterTokens(inputToken, false);
    if (allowedCounterTokens.length === 0) {
      _setInputToken(outputToken);
      const allowedCounterTokens = swapper.getSwapCounterTokens(outputToken, true);
      if (allowedCounterTokens.length === 0) return;
      _setOutputToken(allowedCounterTokens[0]);
    } else {
      _setOutputToken(inputToken);
      if (includesToken(allowedCounterTokens, outputToken)) {
        _setInputToken(outputToken);
      } else {
        _setInputToken(allowedCounterTokens[0]);
      }
    }
    setExactIn((val) => !val);
    setAddress('');
  }, [inputToken, outputToken, swapper]);

  //Don't lock output amounts when WebLN wallet is connected
  const amountsLocked = webLnForOutput ? false : isFixedAmount;

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

  const addressValidationStatus = useMemo<{
    status: 'error' | 'success' | 'warning';
    text: string;
  }>(() => {
    if (swapTypeData?.requiresOutputWallet) return;
    if (addressError && address !== '')
      return {
        status: 'error',
        text: addressError.message,
      };
    if (isOutputWalletAddress || isFixedAmount)
      return {
        status: 'success',
        text: isOutputWalletAddress
          ? 'Wallet address fetched from ' + outputChainData.wallet?.name
          : 'Swap amount imported from lightning network invoice',
      };
    if (quote?.getType() === SwapType.TO_BTCLN) {
      const _quote = quote as ToBTCLNSwap;
      if (_quote.isPayingToNonCustodialWallet())
        return {
          status: 'warning',
          text: 'Please make sure your receiving wallet is online',
        };
      if (_quote.willLikelyFail())
        return {
          status: 'warning',
          text: 'This destination is likely not payable',
        };
    }
  }, [swapTypeData, addressError, address, isOutputWalletAddress, isFixedAmount, outputChainData]);

  //Leaves existing swap
  const leaveExistingSwap = useCallback(
    () => {
      if (existingSwap == null) return;
      setInputToken(existingSwap.getInput().token);
      setOutputToken(existingSwap.getOutput().token);
      setAddress(existingSwap.getOutputAddress());
      if (existingSwap.exactIn) {
        setAmount(existingSwap.getInput().amount);
      } else {
        setAmount(existingSwap.getOutput().amount);
      }
      refreshQuote();
      navigate('/');
    },
    [existingSwap, refreshQuote, navigate]
  );

  const [_UIState, _setUIState] = useState<{quote: ISwap, state: SwapPageUIState}>();
  const setUIState = useCallback((quote: ISwap, state: SwapPageUIState) => {
    _setUIState({quote, state});
    if(state==="hide") {
      navigate("/?swapId="+quote.getId());
    } else {
      navigate("/");
    }
  }, []);
  const UIState = !!_UIState && _UIState.quote.getId()===quote?.getId() ? _UIState.state : "show";

  return {
    input: {
      wallet:
        inputChainData?.wallet == null
          ? undefined
          : {
              data: inputChainData.wallet,
              spendable: maxSpendable?.balance,
              btcFeeRate: maxSpendable?.feeRate,
              disconnect: () => disconnectWallet(inputChainData.chainId),
            },
      token: {
        value: inputToken,
        values: inputTokens,
        onChange: setInputToken,
        disabled: UIState === 'lock',
      },
      amount: {
        value: inputAmount,
        valueUsd: inputValue == null ? undefined : FEConstants.USDollar.format(inputValue),
        onChange: useCallback((value) => {
          setAmount(value);
          setExactIn(true);
        }, []),
        disabled: amountsLocked || webLnForOutput || UIState === 'lock',
        loading: !exactIn && quoteLoading,
        step: inputTokenStep,
        min: inputLimits?.min,
        max: inputLimits?.max,
        validation:
          (exactIn && amountError) || notEnoughBalance
            ? {
                status: 'error',
                text: notEnoughBalance ? 'Not enough balance' : amountError,
              }
            : undefined,
      },
      chainId: inputChainData?.chainId,
      useExternalWallet: useMemo(() => {
        if (!showUseExternalWallet) return undefined;
        return () => disconnectWallet(inputChainData?.chainId);
      }, [showUseExternalWallet, disconnectWallet, inputChainData]),
    },
    changeDirection,
    output: {
      wallet:
        outputChainData?.wallet == null
          ? undefined
          : {
              data: outputChainData.wallet,
              balance: outputMaxSpendable?.balance,
              disconnect: () => disconnectWallet(outputChainData.chainId),
            },
      token: {
        value: outputToken,
        values: outputTokens,
        onChange: setOutputToken,
        disabled: UIState === 'lock',
      },
      amount: {
        value: outputAmount,
        valueUsd: outputValue == null ? undefined : FEConstants.USDollar.format(outputValue),
        onChange: useCallback((value) => {
          setAmount(value);
          setExactIn(false);
        }, []),
        disabled: amountsLocked || UIState === 'lock',
        loading: exactIn && quoteLoading,
        step: outputTokenStep,
        min: outputLimits?.min,
        max: outputLimits?.max,
        validation:
          !exactIn && amountError
            ? {
                status: 'error',
                text: amountError,
              }
            : undefined,
        isFromAddress: isFixedAmount,
      },
      chainId: outputChainData?.chainId,
      gasDrop:
        gasDropTokenAmount == null
          ? undefined
          : {
              checked: gasDropChecked,
              onChange: setGasDropChecked,
              amount: gasDropTokenAmount,
              disabled: UIState === 'lock',
            },
      address:
        swapTypeData?.requiresOutputWallet || (webLnForOutput && validatedAmount == null)
          ? undefined
          : {
              value: outputAddress,
              onChange: setAddress,
              disabled: isOutputWalletAddress || UIState === 'lock',
              loading: addressLoading,
              validation: addressValidationStatus,
              isFromWallet: isOutputWalletAddress,
            },
      webln: useMemo(() => {
        if (!webLnForOutput) return undefined;
        if (outputAddress !== '' || validatedAmount == null) return {};
        return {
          fetchInvoice: () => {
            if (outputAddress !== '') return undefined;
            if (validatedAmount == null) return;
            const webln: WebLNProvider = outputChainData.wallet.instance;
            webln
              .makeInvoice(Number(fromHumanReadableString(validatedAmount, Tokens.BITCOIN.BTCLN)))
              .then((res) => {
                setAddress(res.paymentRequest);
                setAddressFromWebLn(res.paymentRequest);
              })
              .catch((e) => console.error(e));
          },
        };
      }, [webLnForOutput, outputAddress, validatedAmount, outputChainData]),
      showLightningAlert: swapType === SwapType.TO_BTCLN && addressData == null && !webLnForOutput,
    },
    smartChainId: scCurrency.chainId,
    swapType,
    swapTypeData,
    quote: {
      loading: quoteLoading,
      quote,
      isRandom: randomQuote,
      error: quoteError,
      refresh: refreshQuote,
      abort: leaveExistingSwap,
      UICallback: setUIState
    },
    hideUI: UIState === 'hide',
  };
}
