import {useCallback, useRef, useState} from "react";


export function useAsync<Args extends any[], Result>(
    executor: (...args: Args) => Promise<Result>,
    deps: any[]
): [(...args: Args) => boolean, boolean, Result, any] {

    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<Result>(null);
    const [error, setError] = useState<any>(null);
    const executingRef = useRef<boolean>(null);

    const fn = useCallback((...args: Args) => {
        if(executingRef.current) return false;
        executingRef.current = true;
        setLoading(true);
        setSuccess(null);
        setError(null);
        executor(...args).then(res => {
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