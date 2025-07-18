import { useContext, useEffect, useMemo, useState } from "react";
import { toHumanReadable } from "../../tokens/Tokens";
import { SwapsContext } from "../context/SwapsContext";
const defaultConstraints = {
  min: 1n,
  max: null,
};
function toBigNumbers(input, token) {
  if (token == null) return null;
  if (input == null) return null;
  return {
    min: toHumanReadable(input.min, token),
    max: toHumanReadable(input.max, token),
  };
}
export function useAmountConstraints(inCurrency, outCurrency) {
  const { swapper } = useContext(SwapsContext);
  const [updateCount, setUpdateCounts] = useState(0);
  useEffect(() => {
    if (swapper == null) return;
    let listener;
    swapper.on(
      "swapLimitsChanged",
      (listener = () => {
        console.log("useAmountConstraints(): Swap limits changed!");
        setUpdateCounts((prevState) => prevState + 1);
      }),
    );
    return () => {
      swapper.removeListener("swapLimitsChanged", listener);
    };
  }, [swapper]);
  return useMemo(() => {
    if (swapper == null || inCurrency == null || outCurrency == null)
      return {
        input: toBigNumbers(defaultConstraints, inCurrency),
        output: toBigNumbers(defaultConstraints, outCurrency),
      };
    const res = swapper.getSwapLimits(inCurrency, outCurrency);
    return {
      input: toBigNumbers(
        { min: res.input.min?.rawAmount, max: res.input.max?.rawAmount },
        inCurrency,
      ),
      output: toBigNumbers(
        { min: res.output.min?.rawAmount, max: res.output.max?.rawAmount },
        outCurrency,
      ),
    };
  }, [swapper, inCurrency, outCurrency, updateCount]);
}
