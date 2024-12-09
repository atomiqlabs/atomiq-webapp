import { useCallback, useRef, useState } from "react";
export function useAsync(executor, deps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const executingRef = useRef(null);
    const fn = useCallback((...args) => {
        if (executingRef.current)
            return false;
        const maybePromise = executor(...args);
        if (maybePromise == null)
            return true;
        executingRef.current = true;
        setLoading(true);
        setSuccess(null);
        setError(null);
        maybePromise.then(res => {
            executingRef.current = false;
            setLoading(false);
            setSuccess(res);
        }).catch(err => {
            console.error("useAsync(): ", err);
            executingRef.current = false;
            setLoading(false);
            setError(err);
        });
        return true;
    }, deps);
    return [fn, loading, success, error];
}
