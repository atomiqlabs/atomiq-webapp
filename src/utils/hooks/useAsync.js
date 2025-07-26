import { useCallback, useRef, useState } from "react";
export function useAsync(executor, deps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const executingRef = useRef(null);
    const fn = useCallback((...args) => {
        if (executingRef.current)
            return Promise.resolve(null);
        const maybePromise = executor(...args);
        if (maybePromise == null)
            return Promise.resolve(null);
        executingRef.current = true;
        setLoading(true);
        setSuccess(null);
        setError(null);
        return maybePromise
            .then((res) => {
            executingRef.current = false;
            setLoading(false);
            setSuccess(res);
            return res;
        })
            .catch((err) => {
            console.error("useAsync(): ", err);
            executingRef.current = false;
            setLoading(false);
            setError(err);
        });
    }, deps);
    return [fn, loading, success, error];
}
