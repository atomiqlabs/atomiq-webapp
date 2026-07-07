import {RefObject, useCallback, useRef, useState} from 'react';

export function useStateWithRef<S>(
  defaultValue: S
): [S | undefined, (value: S) => void, RefObject<S>] {
  const [value, _setValue] = useState<S>(defaultValue);
  const valueRef = useRef<S>(defaultValue);
  const setValue = useCallback((value: S) => {
    valueRef.current = value;
    _setValue(value);
  }, []);
  return [value, setValue, valueRef];
}
