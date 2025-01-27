import {RefObject, useCallback, useEffect, useRef, useState} from "react";


export function useLocalStorage<T>(name: string, defaultValue: T): [T, (val: T) => void, RefObject<T>] {

    const [value, setValue] = useState<T>(defaultValue);
    const valueRef = useRef<T>(defaultValue);

    useEffect(() => {
        const config = window.localStorage.getItem(name);
        const value = config===undefined ? defaultValue : JSON.parse(config);
        setValue(value);
        valueRef.current = value;
    }, []);

    const setAndSaveValue = useCallback((value: T) => {
        setValue(value);
        valueRef.current = value;
        window.localStorage.setItem(name, JSON.stringify(value));
    }, []);

    return [value, setAndSaveValue, valueRef];

}