import {useEffect, useRef, useState} from "react";

export function useWithAwait<Args extends any[], Result>(
    executor: (...args: Args) => Promise<Result>,
    args: Args,
    parallel: boolean = true
): [Result, boolean, any] {

    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<Result>(null);
    const [error, setError] = useState<any>(null);
    const sequence = useRef<number>(0);
    const currentPromise = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        sequence.current++;
        const currSequence = sequence.current;
        setLoading(true);
        setSuccess(null);
        setError(null);

        const execute = () => executor(...args).then(res => {
            if(currSequence!==sequence.current) return;
            setLoading(false);
            setSuccess(res);
        }).catch(err => {
            if(currSequence!==sequence.current) return;
            setLoading(false);
            setError(err);
        });

        if(parallel) {
            execute();
        } else {
            const _exec = () => {
                if(currSequence!==sequence.current) return;
                currentPromise.current = execute();
            };
            currentPromise.current.then(_exec, _exec);
        }
    }, args);

    return [success, loading, error];
}
