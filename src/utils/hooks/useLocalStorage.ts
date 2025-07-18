import { RefObject, useCallback, useMemo, useRef, useState } from "react";

export function useLocalStorage<T>(
  name: string,
  _defaultValue: T,
): [T, (val: T) => void, RefObject<T>] {
  const initialStoredValue = useMemo(
    () => window.localStorage.getItem(name),
    [],
  );

  const defaultValue =
    initialStoredValue === null
      ? _defaultValue
      : initialStoredValue === "undefined"
        ? undefined
        : initialStoredValue === "null"
          ? null
          : JSON.parse(initialStoredValue);
  const [value, setValue] = useState<T>(defaultValue);
  const valueRef = useRef<T>(defaultValue);

  const setAndSaveValue = useCallback((value: T) => {
    setValue(value);
    valueRef.current = value;
    window.localStorage.setItem(name, JSON.stringify(value));
  }, []);

  return [value, setAndSaveValue, valueRef];
}
