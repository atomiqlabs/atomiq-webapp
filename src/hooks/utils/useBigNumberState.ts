import { useCallback, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';

export function useBigNumberState(
  defaultValue: BigNumber
): [BigNumber, (value: BigNumber | string) => void] {
  const [value, setValue] = useState<BigNumber>(defaultValue);
  const valueRef = useRef<BigNumber>(defaultValue);

  const setState = useCallback((_value: BigNumber | string) => {
    let value = typeof _value === 'string' ? new BigNumber(_value) : _value;
    value = value == null || value.isNaN() ? null : value;
    if (
      (value === null && valueRef.current === null) ||
      (value != null && valueRef.current != null && value.eq(valueRef.current))
    )
      return;
    valueRef.current = value;
    setValue(value);
  }, []);

  return [value, setState];
}
