import { useCallback, useEffect, useRef, useState } from "react";
export function useWithAwait(executor, args, parallel = true) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const sequence = useRef(0);
    const currentPromise = useRef(Promise.resolve());
    const refresh = useCallback(() => {
        sequence.current++;
        const currSequence = sequence.current;
        setLoading(true);
        setSuccess(null);
        setError(null);
        const execute = async () => {
            try {
                const result = await executor(...args);
                if (currSequence !== sequence.current)
                    return;
                setLoading(false);
                setSuccess(result);
            }
            catch (err) {
                if (currSequence !== sequence.current)
                    return;
                setLoading(false);
                setError(err);
            }
        };
        if (parallel) {
            execute();
        }
        else {
            const _exec = () => {
                if (currSequence !== sequence.current)
                    return;
                currentPromise.current = execute();
            };
            currentPromise.current.then(_exec, _exec);
        }
    }, args);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return [success, loading, error, refresh];
}
