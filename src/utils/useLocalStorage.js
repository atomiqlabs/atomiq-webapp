import { useCallback, useMemo, useRef, useState } from "react";
export function useLocalStorage(name, _defaultValue) {
    const initialStoredValue = useMemo(() => window.localStorage.getItem(name), []);
    const defaultValue = initialStoredValue === null ? _defaultValue : JSON.parse(initialStoredValue);
    const [value, setValue] = useState(defaultValue);
    const valueRef = useRef(defaultValue);
    const setAndSaveValue = useCallback((value) => {
        setValue(value);
        valueRef.current = value;
        window.localStorage.setItem(name, JSON.stringify(value));
    }, []);
    return [value, setAndSaveValue, valueRef];
}
