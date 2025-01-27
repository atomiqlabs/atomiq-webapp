import { useCallback, useEffect, useRef, useState } from "react";
export function useLocalStorage(name, defaultValue) {
    const [value, setValue] = useState(defaultValue);
    const valueRef = useRef(defaultValue);
    useEffect(() => {
        const config = window.localStorage.getItem(name);
        const value = config === undefined ? defaultValue : JSON.parse(config);
        setValue(value);
        valueRef.current = value;
    }, []);
    const setAndSaveValue = useCallback((value) => {
        setValue(value);
        valueRef.current = value;
        window.localStorage.setItem(name, JSON.stringify(value));
    }, []);
    return [value, setAndSaveValue, valueRef];
}
