import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Alert, Button } from "react-bootstrap";
import { useContext, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toHumanReadableString } from "@atomiqlabs/sdk";
import { SwapsContext } from "../context/SwapsContext";
import { toTokenIdentifier } from "../../tokens/Tokens";
const swapMinimum = 1000000n;
export function SwapForGasAlert(props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { swapper } = useContext(SwapsContext);
  const feeNeeded = useMemo(() => {
    if (props.notEnoughForGas == null || props.quote == null || swapper == null)
      return null;
    const nativeToken = swapper.Utils.getNativeToken(
      props.quote.chainIdentifier,
    );
    let amount = props.notEnoughForGas;
    if (amount < swapMinimum) amount = swapMinimum;
    return {
      rawAmount: amount,
      amount: toHumanReadableString(amount, nativeToken),
      nativeToken,
    };
  }, [props.notEnoughForGas, props.quote, swapper]);
  return _jsxs(Alert, {
    className: "text-center mb-3 d-flex align-items-center flex-column",
    show: !!props.notEnoughForGas,
    variant: "danger",
    closeVariant: "white",
    children: [
      _jsxs("strong", {
        children: ["Not enough ", feeNeeded?.nativeToken?.ticker, " for fees"],
      }),
      _jsxs("label", {
        children: [
          "You need at least ",
          feeNeeded?.amount,
          " more ",
          feeNeeded?.nativeToken?.ticker,
          " to pay for fees and refundable deposit! You can use ",
          _jsx("b", { children: "Bitcoin Lightning" }),
          " to swap for gas first & then continue swapping here!",
        ],
      }),
      _jsx(Button, {
        className: "mt-2",
        variant: "secondary",
        onClick: () => {
          const params = new URLSearchParams();
          params.set(
            "tokenIn",
            toTokenIdentifier(props.quote.getInput().token),
          );
          params.set(
            "tokenOut",
            toTokenIdentifier(props.quote.getOutput().token),
          );
          params.set("exactIn", "" + props.quote.exactIn);
          params.set(
            "amount",
            props.quote.exactIn
              ? props.quote.getInput().amount
              : props.quote.getOutput().amount,
          );
          navigate("/gas", {
            state: {
              returnPath: location.pathname + "?" + params.toString(),
              chainId: props.quote.chainIdentifier,
              amount: feeNeeded?.rawAmount.toString(10),
            },
          });
        },
        children: "Swap for gas",
      }),
    ],
  });
}
