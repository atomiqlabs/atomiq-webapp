import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import {
  fromHumanReadableString,
  isBtcToken,
  isSCToken,
  SpvFromBTCSwap,
  SwapType,
  toTokenAmount,
} from "@atomiqlabs/sdk";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SwapsContext } from "../swaps/context/SwapsContext";
import { useAddressData } from "../swaps/hooks/useAddressData";
import ValidatedInput, { numberValidator } from "../components/ValidatedInput";
import { useAmountConstraints } from "../swaps/hooks/useAmountConstraints";
import { useWalletBalance } from "../wallets/hooks/useWalletBalance";
import { SwapTopbar } from "./SwapTopbar";
import { QRScannerModal } from "../qr/QRScannerModal";
import {
  Alert,
  Button,
  Card,
  OverlayTrigger,
  Spinner,
  Tooltip,
} from "react-bootstrap";
import {
  fromTokenIdentifier,
  getChainIdentifierForCurrency,
  includesToken,
  smartChainTokenArray,
  toTokenIdentifier,
} from "../tokens/Tokens";
import { FEConstants, Tokens } from "../FEConstants";
import BigNumber from "bignumber.js";
import { CurrencyDropdown } from "../tokens/CurrencyDropdown";
import { SimpleFeeSummaryScreen } from "../fees/SimpleFeeScreen";
import { QuoteSummary } from "../swaps/QuoteSummary";
import { ErrorAlert } from "../components/ErrorAlert";
import { useQuote } from "../swaps/hooks/useQuote";
import { usePricing } from "../tokens/hooks/usePricing";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "react-icons-kit";
import { arrows_vertical } from "react-icons-kit/ikons/arrows_vertical";
import { ic_qr_code_scanner } from "react-icons-kit/md/ic_qr_code_scanner";
import { lock } from "react-icons-kit/fa/lock";
import { ic_power_off_outline } from "react-icons-kit/md/ic_power_off_outline";
import { useExistingSwap } from "../swaps/hooks/useExistingSwap";
import { ConnectedWalletAnchor } from "../wallets/ConnectedWalletAnchor";
import { useStateWithOverride } from "../utils/hooks/useStateWithOverride";
import { useChainForCurrency } from "../wallets/hooks/useChainForCurrency";
import { useSupportedTokens } from "../swaps/hooks/useSupportedTokens";
import { useDecimalNumberState } from "../utils/hooks/useDecimalNumberState";
import { ChainDataContext } from "../wallets/context/ChainDataContext";
export function SwapNew(props) {
  const navigate = useNavigate();
  const { swapper } = useContext(SwapsContext);
  const [inputTokens, outputTokens] = useSupportedTokens();
  //Existing swap quote
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const propSwapId = params.get("swapId");
  const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
  const [isUnlocked, setUnlocked] = useState(false);
  const locked = !isUnlocked && existingSwap != null;
  //Tokens
  const [inputToken, setInputToken] = useStateWithOverride(
    Tokens.BITCOIN.BTC,
    existingSwap?.getInput().token,
  );
  const [outputToken, setOutputToken] = useStateWithOverride(
    smartChainTokenArray[0],
    existingSwap?.getOutput().token,
  );
  const swapType = useMemo(
    () => swapper?.getSwapType(inputToken, outputToken),
    [swapper, inputToken, outputToken],
  );
  const scCurrency = isSCToken(inputToken)
    ? inputToken
    : isSCToken(outputToken)
      ? outputToken
      : null;
  const inputChainData = useChainForCurrency(inputToken);
  const outputChainData = useChainForCurrency(outputToken);
  const chainsData = useContext(ChainDataContext);
  //Address
  const addressRef = useRef();
  const addressValidator = useCallback(
    (val) => {
      if (swapper == null) return null;
      try {
        const addressParseResult = swapper.Utils.parseAddressSync(val);
        if (addressParseResult == null) return "Invalid address";
      } catch (e) {
        console.log("Address parsing error: ", e);
        return e.message;
      }
      return null;
    },
    [swapper],
  );
  const [address, setAddress] = useState(null);
  let [addressData, addressLoading, addressError] = useAddressData(
    address,
    (addressData) => {
      if (addressData?.type == null) return;
      let token;
      switch (addressData.type) {
        case "BITCOIN":
          token = swapper
            .getSupportedTokens(false)
            .find((val) => isBtcToken(val) && !val.lightning);
          break;
        case "LNURL":
          if (addressData.lnurl.type === "withdraw") {
            navigate("/scan/2?address=" + encodeURIComponent(address));
            return;
          }
        case "LIGHTNING":
          token = swapper
            .getSupportedTokens(false)
            .find((val) => isBtcToken(val) && val.lightning);
          break;
        default:
          if (
            isSCToken(outputToken) &&
            outputToken.chainId === addressData.type
          )
            token = outputToken;
          token = swapper
            .getSupportedTokens(false)
            .find((val) => isSCToken(val) && val.chainId === addressData.type);
          break;
      }
      if (outputToken === token) return;
      if (token == null) return "Address not supported for swaps!";
      const counterTokens = swapper.getSwapCounterTokens(token, false);
      if (counterTokens.length === 0) return "Address not supported for swaps!";
      const outputChainData = chainsData[getChainIdentifierForCurrency(token)];
      if (
        outputChainData.wallet != null &&
        outputChainData.wallet.address != null &&
        outputChainData.wallet.address !== addressData.address
      ) {
        console.log(
          "SwapNew(): Disconnecting wallet: " + outputChainData.wallet.name,
        );
        outputChainData.disconnect();
      }
      console.log(
        "SwapNew(): Using token based on the address: " + outputToken.ticker,
      );
      setOutputToken(token);
      if (!includesToken(counterTokens, inputToken)) {
        if (includesToken(counterTokens, outputToken)) {
          setInputToken(outputToken);
          setExactIn(!exactIn);
        } else {
          setInputToken(counterTokens[0]);
        }
      }
    },
  );
  if (outputChainData?.wallet?.address != null) {
    addressData = {
      address: outputChainData.wallet.address,
      type: outputChainData.id,
      swapType: null,
    };
    addressLoading = false;
    addressError = null;
  }
  const isFixedAmount = addressData?.amount != null;
  //Amounts
  const inputRef = useRef();
  const outputRef = useRef();
  const [_amount, setAmount] = useDecimalNumberState();
  const amount = isFixedAmount ? addressData.amount.amount : _amount;
  const [exactIn, setExactIn] = useStateWithOverride(
    true,
    isFixedAmount ? false : null,
  );
  const { input: swapInputLimits, output: swapOutputLimits } =
    useAmountConstraints(inputToken, outputToken);
  //Url defined amount & swap type
  useEffect(() => {
    const tokenIn = fromTokenIdentifier(params.get("tokenIn"));
    const tokenOut = fromTokenIdentifier(params.get("tokenOut"));
    if (tokenIn != null) setInputToken(tokenIn);
    if (tokenOut != null) setOutputToken(tokenOut);
    const exactIn = params.get("exactIn");
    const amount = params.get("amount");
    if (exactIn != null && amount != null) {
      setExactIn(exactIn === "true");
      if (exactIn === "true") {
        inputRef.current.setValue(amount);
      } else {
        outputRef.current.setValue(amount);
      }
    }
  }, [search]);
  //Gas drop
  const [gasDropChecked, setGasDropChecked] = useStateWithOverride(
    false,
    existingSwap instanceof SpvFromBTCSwap
      ? existingSwap.getGasDropOutput().rawAmount > 0
      : undefined,
  );
  const gasDropTokenAmount = useMemo(() => {
    if (
      existingSwap != null &&
      existingSwap.getType() === SwapType.SPV_VAULT_FROM_BTC &&
      existingSwap.getGasDropOutput().rawAmount > 0
    )
      return existingSwap.getGasDropOutput?.();
    if (
      swapper != null &&
      isSCToken(outputToken) &&
      swapType === SwapType.SPV_VAULT_FROM_BTC
    ) {
      const nativeToken = swapper.Utils.getNativeToken(outputToken.chainId);
      if (nativeToken.address === outputToken.address) return;
      return toTokenAmount(
        FEConstants.scBalances[toTokenIdentifier(nativeToken)]?.optimal,
        nativeToken,
        swapper.prices,
      );
    }
  }, [swapper, existingSwap, swapType, outputToken]);
  //Check native currency balance for gas drop
  useEffect(() => {
    if (
      addressData?.address == null ||
      swapper == null ||
      gasDropTokenAmount == null
    )
      return;
    let cancelled = false;
    swapper.Utils.getSpendableBalance(
      addressData?.address,
      gasDropTokenAmount.token,
    ).then((value) => {
      if (cancelled) return;
      const requiredBalance =
        FEConstants.scBalances[toTokenIdentifier(gasDropTokenAmount.token)]
          ?.minimum;
      if (value < requiredBalance) {
        setGasDropChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gasDropTokenAmount, addressData?.address, swapper]);
  //Max spendable
  const [minBtcTxFee, setMinBtcTxFee] = useState(null);
  const maxSpendable = useWalletBalance(
    inputToken,
    swapType,
    scCurrency.chainId,
    gasDropTokenAmount != null && gasDropChecked,
    locked,
    minBtcTxFee,
  );
  const inputLimits = useMemo(() => {
    if (maxSpendable?.balance == null) return swapInputLimits;
    return {
      min: swapInputLimits.min,
      max: BigNumber.min(
        swapInputLimits.max,
        new BigNumber(maxSpendable.balance.amount),
      ),
    };
  }, [swapInputLimits, maxSpendable?.balance?.rawAmount]);
  const outputLimits = useMemo(() => {
    if (addressData?.min == null && addressData?.max == null)
      return swapOutputLimits;
    return {
      min:
        addressData?.min?.amount == null
          ? swapOutputLimits.min
          : BigNumber.max(
              new BigNumber(addressData?.min?.amount),
              swapOutputLimits.min,
            ),
      max:
        addressData?.max?.amount == null
          ? swapOutputLimits.max
          : BigNumber.min(
              new BigNumber(addressData?.max?.amount),
              swapOutputLimits.max,
            ),
    };
  }, [swapOutputLimits, addressData?.min?.amount, addressData?.max?.amount]);
  const inputAmountValidator = useCallback(numberValidator(inputLimits, true), [
    inputLimits,
  ]);
  const outputAmountValidator = useCallback(
    numberValidator(outputLimits, true),
    [outputLimits],
  );
  const validatedAmount = useMemo(() => {
    if (
      (exactIn ? inputAmountValidator : outputAmountValidator)(amount) == null
    )
      return amount === "" ? null : new BigNumber(amount).toString(10);
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
    addressLoading,
  );
  useEffect(() => {
    if (
      quote == null ||
      maxSpendable?.feeRate == null ||
      swapType !== SwapType.SPV_VAULT_FROM_BTC ||
      quote?.getType() !== SwapType.SPV_VAULT_FROM_BTC
    )
      return;
    const quoteMinFee = quote.minimumBtcFeeRate;
    setMinBtcTxFee(quoteMinFee >= maxSpendable.feeRate ? quoteMinFee : null);
  }, [quote, swapType, maxSpendable?.feeRate]);
  useEffect(() => {
    addressRef.current.validate();
  }, [quote]);
  //Final output/input amounts, value and output address
  const [outputAddress, inputAmount, outputAmount, isOutputWalletAddress] =
    useMemo(() => {
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
        exactIn ? amount : "",
        !exactIn ? amount : "",
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
  const [qrScanning, setQrScanning] = useState(false);
  //Leaves existing swap
  const leaveExistingSwap = useCallback(
    (noSetAddress, noSetAmounts) => {
      if (existingSwap == null) return;
      setInputToken(existingSwap.getInput().token);
      setOutputToken(existingSwap.getOutput().token);
      if (!noSetAddress)
        addressRef.current.setValue(existingSwap.getOutputAddress());
      if (!noSetAmounts)
        if (existingSwap.exactIn) {
          inputRef.current.setValue(existingSwap.getInput().amount);
        } else {
          outputRef.current.setValue(existingSwap.getOutput().amount);
        }
      navigate("/");
    },
    [existingSwap],
  );
  //Changes the direction of the swap, reverses input and output tokens
  const changeDirection = useCallback(() => {
    if (locked || swapper == null) return;
    leaveExistingSwap(true);
    const allowedCounterTokens = swapper.getSwapCounterTokens(
      inputToken,
      false,
    );
    if (allowedCounterTokens.length === 0) {
      setInputToken(outputToken);
      const allowedCounterTokens = swapper.getSwapCounterTokens(
        outputToken,
        true,
      );
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
    addressRef.current.setValue("");
  }, [inputToken, outputToken, leaveExistingSwap, swapper, locked]);
  const webLnForOutput =
    existingSwap == null &&
    outputChainData?.chain?.name === "Lightning" &&
    outputChainData?.wallet != null;
  useEffect(() => {
    if (!webLnForOutput) return;
    if (exactIn) {
      inputRef.current.setValue("");
      setExactIn(false);
    }
    addressRef.current.setValue("");
  }, [webLnForOutput]);
  //Don't lock output amounts when WebLN wallet is connected
  const amountsLocked = webLnForOutput ? false : isFixedAmount;
  const setAmountLock = useCallback(
    (val) => {
      if (existingSwap == null) {
        if (val) {
          console.log(
            "SwapNew: setAmountLock, locking swap and redirecting to swap: " +
              quote.getId(),
          );
          setUnlocked(false);
          navigate("/?swapId=" + quote.getId());
        } else {
          navigate("/");
        }
      } else {
        setUnlocked(!val);
      }
    },
    [quote, existingSwap],
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
  }, [
    swapper,
    maxSpendable?.balance,
    inputAmount,
    swapInputLimits?.max,
    swapType,
  ]);
  return _jsxs(_Fragment, {
    children: [
      _jsx(SwapTopbar, { selected: 0, enabled: !locked }),
      _jsx(QRScannerModal, {
        onScanned: (data) => {
          console.log("QR scanned: ", data);
          addressRef.current.setValue(data);
          setQrScanning(false);
        },
        show: qrScanning,
        onHide: () => setQrScanning(false),
      }),
      _jsx("div", {
        className: "d-flex flex-column align-items-center text-white",
        children: _jsxs(Card, {
          className: "p-3 swap-panel tab-bg mx-3 mb-3 border-0",
          children: [
            _jsx(ErrorAlert, { title: "Quote error", error: quoteError }),
            _jsxs(Card, {
              className: "d-flex flex-column tab-accent-p3 pt-2",
              children: [
                _jsxs("div", {
                  className: "d-flex flex-row",
                  children: [
                    _jsx("small", {
                      className: "text-light text-opacity-75 me-auto",
                      children: "You pay",
                    }),
                    maxSpendable != null
                      ? _jsxs(_Fragment, {
                          children: [
                            _jsxs("div", {
                              className: "d-flex align-items-center",
                              children: [
                                _jsx(ConnectedWalletAnchor, {
                                  noText: true,
                                  currency: inputToken,
                                }),
                                _jsxs("small", {
                                  className: "me-2",
                                  children: [
                                    maxSpendable?.balance?.amount,
                                    " ",
                                    inputToken.ticker,
                                  ],
                                }),
                              ],
                            }),
                            _jsx(Button, {
                              variant: "outline-light",
                              style: { marginBottom: "2px" },
                              className: "py-0 px-1",
                              disabled: locked || amountsLocked,
                              onClick: () => {
                                setExactIn(true);
                                inputRef.current.setValue(
                                  maxSpendable?.balance?.amount,
                                );
                              },
                              children: _jsx("small", {
                                className: "font-smallest",
                                style: { marginBottom: "-2px" },
                                children: "MAX",
                              }),
                            }),
                          ],
                        })
                      : _jsx("small", {
                          children: _jsx(ConnectedWalletAnchor, {
                            noText: false,
                            currency: inputToken,
                          }),
                        }),
                  ],
                }),
                _jsx(ValidatedInput, {
                  disabled: locked || amountsLocked || webLnForOutput,
                  inputRef: inputRef,
                  className: "flex-fill",
                  type: "number",
                  value: inputAmount,
                  size: "lg",
                  textStart:
                    !exactIn && quoteLoading
                      ? _jsx(Spinner, { size: "sm", className: "text-white" })
                      : null,
                  onChange: (value, forcedChange) => {
                    setAmount(value);
                    setExactIn(true);
                    if (!forcedChange) leaveExistingSwap(false, true);
                  },
                  inputId: "amount-input",
                  inputClassName: "font-weight-500",
                  floatingLabel:
                    inputValue == null
                      ? null
                      : FEConstants.USDollar.format(inputValue),
                  expectingFloatingLabel: true,
                  step:
                    inputToken == null
                      ? new BigNumber("0.00000001")
                      : new BigNumber(10).pow(
                          new BigNumber(
                            -(
                              inputToken.displayDecimals ?? inputToken.decimals
                            ),
                          ),
                        ),
                  min: inputLimits?.min,
                  max: inputLimits?.max,
                  onValidate: inputAmountValidator,
                  feedbackEndElement: showUseExternalWallet
                    ? _jsx("a", {
                        className: "ms-auto",
                        href: "#",
                        onClick: (event) => {
                          event.preventDefault();
                          inputChainData?.disconnect?.();
                        },
                        children: "Use external wallet",
                      })
                    : null,
                  validated: notEnoughBalance
                    ? "Not enough balance"
                    : (!exactIn && quote != null) || existingSwap != null
                      ? null
                      : undefined,
                  elementEnd: _jsx(CurrencyDropdown, {
                    currencyList: inputTokens,
                    onSelect: (val) => {
                      if (locked) return;
                      leaveExistingSwap();
                      const supportedCounterTokens =
                        swapper.getSwapCounterTokens(val, true);
                      setInputToken(val);
                      if (includesToken(supportedCounterTokens, outputToken))
                        return;
                      let newOutputToken;
                      if (includesToken(supportedCounterTokens, inputToken)) {
                        newOutputToken = inputToken;
                        setExactIn(!exactIn);
                      } else {
                        if (isSCToken(outputToken))
                          newOutputToken = supportedCounterTokens.find(
                            (val) =>
                              isSCToken(val) &&
                              val.chainId === outputToken.chainId,
                          );
                        newOutputToken ??
                          (newOutputToken = supportedCounterTokens[0]);
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
                        addressRef.current.setValue("");
                    },
                    value: inputToken,
                    className: "round-right text-white bg-black bg-opacity-10",
                  }),
                }),
              ],
            }),
            _jsx("div", {
              className: "d-flex justify-content-center swap-direction-wrapper",
              children: _jsx(Button, {
                onClick: changeDirection,
                size: "lg",
                className: "px-0 swap-direction-btn",
                children: _jsx(Icon, {
                  size: 22,
                  icon: arrows_vertical,
                  style: { marginTop: "-8px" },
                }),
              }),
            }),
            _jsxs(Card, {
              className: "tab-accent-p3 pt-2",
              children: [
                _jsxs("div", {
                  className: "d-flex flex-row",
                  children: [
                    _jsx("small", {
                      className: "text-light text-opacity-75 me-auto",
                      children: "You receive",
                    }),
                    _jsx("small", {
                      children: _jsx(ConnectedWalletAnchor, {
                        noText: false,
                        currency: outputToken,
                      }),
                    }),
                  ],
                }),
                _jsx("div", {
                  className: "d-flex flex-row",
                  children: _jsx(ValidatedInput, {
                    disabled: locked || amountsLocked,
                    inputRef: outputRef,
                    className: "flex-fill strip-group-text",
                    type: "number",
                    value: outputAmount,
                    size: "lg",
                    textStart:
                      exactIn && quoteLoading
                        ? _jsx(Spinner, { size: "sm", className: "text-white" })
                        : null,
                    onChange: (val, forcedChange) => {
                      setAmount(val);
                      setExactIn(false);
                      if (webLnForOutput) addressRef.current.setValue("");
                      if (!forcedChange)
                        leaveExistingSwap(webLnForOutput, true);
                    },
                    inputId: "amount-output",
                    inputClassName: "font-weight-500",
                    floatingLabel:
                      outputValue == null
                        ? null
                        : FEConstants.USDollar.format(outputValue),
                    expectingFloatingLabel: true,
                    step:
                      outputToken == null
                        ? new BigNumber("0.00000001")
                        : new BigNumber(10).pow(
                            new BigNumber(
                              -(
                                outputToken.displayDecimals ??
                                outputToken.decimals
                              ),
                            ),
                          ),
                    min: outputLimits?.min,
                    max: outputLimits?.max,
                    onValidate: outputAmountValidator,
                    validated:
                      (exactIn && quote != null) || existingSwap != null
                        ? null
                        : undefined,
                    elementEnd: _jsx(CurrencyDropdown, {
                      currencyList: outputTokens,
                      onSelect: (val) => {
                        if (locked) return;
                        leaveExistingSwap();
                        if (val === outputToken) return;
                        if (
                          getChainIdentifierForCurrency(val) !==
                          getChainIdentifierForCurrency(outputToken)
                        )
                          addressRef.current.setValue("");
                        const supportedCounterTokens =
                          swapper.getSwapCounterTokens(val, false);
                        setOutputToken(val);
                        if (includesToken(supportedCounterTokens, inputToken))
                          return;
                        if (
                          includesToken(supportedCounterTokens, outputToken)
                        ) {
                          setInputToken(outputToken);
                          setExactIn(!exactIn);
                        } else {
                          let token;
                          if (isSCToken(inputToken))
                            token = supportedCounterTokens.find(
                              (val) =>
                                isSCToken(val) &&
                                val.chainId === inputToken.chainId,
                            );
                          token ?? (token = supportedCounterTokens[0]);
                          if (token == null) {
                            setOutputToken(outputToken);
                            return;
                          }
                          setInputToken(token);
                        }
                      },
                      value: outputToken,
                      className:
                        "round-right text-white bg-black bg-opacity-10",
                    }),
                  }),
                }),
                _jsx("div", {
                  className: gasDropTokenAmount != null ? "d-flex" : "d-none",
                  children: _jsx(ValidatedInput, {
                    type: "checkbox",
                    className: "flex-fill mt-1",
                    onChange: (val) => {
                      setGasDropChecked(val);
                      leaveExistingSwap();
                    },
                    placeholder: _jsx("span", {
                      children: _jsx(OverlayTrigger, {
                        overlay: _jsx(Tooltip, {
                          id: "fee-tooltip-gas-drop",
                          children: _jsxs("span", {
                            children: [
                              "Swap some amount of BTC to ",
                              gasDropTokenAmount?.token.ticker,
                              " (gas token on the destination chain), so that you can transact on ",
                              gasDropTokenAmount?.token.chainId,
                            ],
                          }),
                        }),
                        children: _jsxs("span", {
                          className: "dottedUnderline",
                          children: [
                            "Request gas drop of ",
                            gasDropTokenAmount?._amount.toString(10),
                            " ",
                            gasDropTokenAmount?.token.ticker,
                          ],
                        }),
                      }),
                    }),
                    value: gasDropChecked,
                    onValidate: () => null,
                    disabled: locked,
                  }),
                }),
                _jsxs("div", {
                  className:
                    "flex-column " +
                    (swapper == null ||
                    swapper?.SwapTypeInfo[swapType].requiresOutputWallet
                      ? "d-none"
                      : "d-flex"),
                  children: [
                    _jsx(ValidatedInput, {
                      type: "text",
                      className:
                        "flex-fill mt-3 " +
                        (webLnForOutput && addressData?.address == null
                          ? "d-none"
                          : ""),
                      onChange: (val, forcedChange) => {
                        setAddress(val);
                        if (!forcedChange) leaveExistingSwap(true);
                      },
                      value: outputAddress,
                      inputRef: addressRef,
                      placeholder: "Destination wallet address",
                      onValidate: addressValidator,
                      validated:
                        isOutputWalletAddress || outputAddress !== address
                          ? null
                          : addressError?.message,
                      disabled: locked || outputChainData?.wallet != null,
                      feedbackEndElement:
                        outputChainData?.wallet == null
                          ? _jsx("a", {
                              className: "ms-auto",
                              href: "#",
                              onClick: (event) => {
                                event.preventDefault();
                                outputChainData.connect();
                              },
                              children: "Connect wallet",
                            })
                          : null,
                      textStart: addressLoading
                        ? _jsx(Spinner, { size: "sm", className: "text-white" })
                        : null,
                      textEnd: locked
                        ? null
                        : outputChainData?.wallet != null
                          ? _jsx(OverlayTrigger, {
                              placement: "top",
                              overlay: _jsx(Tooltip, {
                                id: "scan-qr-tooltip",
                                children:
                                  "Disconnect wallet & use external wallet",
                              }),
                              children: _jsx("a", {
                                href: "#",
                                style: {
                                  marginTop: "-3px",
                                },
                                onClick: (e) => {
                                  e.preventDefault();
                                  outputChainData.disconnect();
                                },
                                children: _jsx(Icon, {
                                  size: 24,
                                  icon: ic_power_off_outline,
                                }),
                              }),
                            })
                          : _jsx(OverlayTrigger, {
                              placement: "top",
                              overlay: _jsx(Tooltip, {
                                id: "scan-qr-tooltip",
                                children: "Scan QR code",
                              }),
                              children: _jsx("a", {
                                href: "#",
                                style: {
                                  marginTop: "-3px",
                                },
                                onClick: (e) => {
                                  e.preventDefault();
                                  setQrScanning(true);
                                },
                                children: _jsx(Icon, {
                                  size: 24,
                                  icon: ic_qr_code_scanner,
                                }),
                              }),
                            }),
                      successFeedback: isOutputWalletAddress
                        ? "Address fetched from your " +
                          outputChainData?.wallet.name +
                          " wallet!"
                        : null,
                    }),
                    webLnForOutput
                      ? _jsx(_Fragment, {
                          children:
                            addressData?.address == null &&
                            validatedAmount != null
                              ? _jsx("div", {
                                  className: "mt-2",
                                  children: _jsx("a", {
                                    href: "#",
                                    onClick: async (e) => {
                                      e.preventDefault();
                                      if (validatedAmount == null) return;
                                      const webln =
                                        outputChainData.wallet.instance;
                                      try {
                                        const res = await webln.makeInvoice(
                                          Number(
                                            fromHumanReadableString(
                                              validatedAmount,
                                              Tokens.BITCOIN.BTCLN,
                                            ),
                                          ),
                                        );
                                        addressRef.current.setValue(
                                          res.paymentRequest,
                                        );
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    },
                                    children: "Fetch invoice from WebLN",
                                  }),
                                })
                              : "",
                        })
                      : "",
                    _jsx(Alert, {
                      variant: "success",
                      className: "mt-3 mb-0 text-center",
                      show:
                        !locked &&
                        outputChainData?.wallet == null &&
                        isBtcToken(outputToken) &&
                        outputToken.lightning &&
                        addressData == null,
                      children: _jsx("label", {
                        children:
                          "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount.",
                      }),
                    }),
                  ],
                }),
              ],
            }),
            quoteError != null
              ? _jsx(Button, {
                  variant: "light",
                  className: "mt-3",
                  onClick: refreshQuote,
                  children: "Retry",
                })
              : "",
            quote != null || existingSwap != null
              ? _jsxs(_Fragment, {
                  children: [
                    _jsx("div", {
                      className: "mt-3",
                      children: _jsx(SimpleFeeSummaryScreen, {
                        swap: existingSwap ?? quote,
                        btcFeeRate:
                          inputToken.chain === "BTC"
                            ? maxSpendable?.feeRate
                            : null,
                      }),
                    }),
                    !randomQuote ||
                    swapper.SwapTypeInfo[swapType].requiresOutputWallet
                      ? _jsx("div", {
                          className: "mt-3 d-flex flex-column text-white",
                          children: _jsx(QuoteSummary, {
                            type: "swap",
                            quote: existingSwap ?? quote,
                            balance: maxSpendable?.balance.rawAmount ?? null,
                            refreshQuote: () => {
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
                            },
                            setAmountLock: setAmountLock,
                            abortSwap: () => {
                              inputRef.current.setValue("");
                              outputRef.current.setValue("");
                              navigate("/");
                            },
                            feeRate: maxSpendable?.feeRate,
                          }),
                        })
                      : "",
                  ],
                })
              : "",
          ],
        }),
      }),
      _jsx("div", {
        className:
          "text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3",
        children: _jsxs("div", {
          className:
            "cursor-pointer d-flex align-items-center justify-content-center",
          onClick: () => navigate("/faq?tabOpen=6"),
          children: [
            _jsx(Icon, {
              size: 18,
              icon: lock,
              style: { marginTop: "-0.5rem" },
            }),
            _jsx("small", { children: "Audited by" }),
            scCurrency?.chainId === "STARKNET"
              ? _jsx("img", {
                  className: "d-block ms-1",
                  height: 18,
                  src: "/csc-white-logo.png",
                  style: { marginTop: "-0.075rem", opacity: 0.6 },
                })
              : _jsx("img", {
                  className: "opacity-50 d-block ms-1",
                  height: 18,
                  src: "/ackee_blockchain.svg",
                  style: { marginTop: "-0.125rem" },
                }),
          ],
        }),
      }),
    ],
  });
}
