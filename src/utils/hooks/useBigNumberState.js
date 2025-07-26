import { useCallback, useRef, useState } from "react";
import BigNumber from "bignumber.js";
export function useBigNumberState(defaultValue) {
    const [value, setValue] = useState(defaultValue);
    const valueRef = useRef(defaultValue);
    const setState = useCallback((_value) => {
        let value = typeof _value === "string" ? new BigNumber(_value) : _value;
        value = value == null || value.isNaN() ? null : value;
        if ((value === null && valueRef.current === null) ||
            (value != null && valueRef.current != null && value.eq(valueRef.current)))
            return;
        valueRef.current = value;
        setValue(value);
    }, []);
    return [value, setState];
}
