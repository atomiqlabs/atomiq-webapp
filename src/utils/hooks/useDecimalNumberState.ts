import { useCallback, useRef, useState } from "react";
import BigNumber from "bignumber.js";

export function useDecimalNumberState(
  defaultValue?: string,
): [string, (value: string) => void] {
  const [value, _setValue] = useState<string>(defaultValue);

  const setValue = useCallback((value: string) => {
    if (value != null && value.includes("e"))
      try {
        const parsed = new BigNumber(value);
        if (!parsed.isNaN()) {
          _setValue(parsed.toString(10));
          return;
        }
      } catch (e) {}
    _setValue(value);
  }, []);

  return [value, setValue];
}
