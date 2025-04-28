import { useEffect, useRef, useState } from "react";
export function useWithAwait(executor, args, parallel = true) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const sequence = useRef(0);
    const currentPromise = useRef(Promise.resolve());
    useEffect(() => {
        sequence.current++;
        const currSequence = sequence.current;
        setLoading(true);
        setSuccess(null);
        setError(null);
        const execute = () => executor(...args).then(res => {
            if (currSequence !== sequence.current)
                return;
            setLoading(false);
            setSuccess(res);
        }).catch(err => {
            if (currSequence !== sequence.current)
                return;
            setLoading(false);
            setError(err);
        });
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
    return [success, loading, error];
}
