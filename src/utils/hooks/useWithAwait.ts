import {useCallback, useMemo, useRef, useState} from "react";

type AwaitLatestProcessedState<Result> = {
    sequence: number,
    value?: Result,
    error?: any
};

export function useWithAwait<Result>(
    executor: () => Promise<Result>  | Result,
    dependencies: any[],
    parallel: boolean = true,
    callback?: (result: Result, error: any) => void,
    pause?: boolean
): [Result, boolean, any, () => void] {

    const [latestProcessed, setLatestProcessed] = useState<AwaitLatestProcessedState<Result> & {lastDeps?: any[]}>({sequence: 0, value: null, error: null});
    const latestProcessedRef = useRef<AwaitLatestProcessedState<Result> & {lastDeps: any[]}>({sequence: 0, value: null, error: null, lastDeps: dependencies});
    const sequence = useRef<number>(0);
    const currentPromise = useRef<Promise<void>>(null);
    const currentCallback = useRef<(result: Result, error: any) => void>(null);
    currentCallback.current = callback;

    const depsRef = useRef<any[]>();
    useMemo(() => {
        if(pause) return;
        depsRef.current = dependencies;
    }, dependencies.concat([pause]));

    const runAction = useCallback<() => [Result, number, any]>((() => {
        sequence.current++;
        const currSequence = sequence.current;

        const execute = () => {
            currentPromise.current = null;
            let promise: Promise<Result> | Result = null;
            try {
                promise = executor();
            } catch (e) {
                console.error(e);
                latestProcessedRef.current = {sequence: -1, error: e, lastDeps: dependencies};
                if(currentCallback.current!=null) currentCallback.current(null, e);
                return [null as Result, -1, e];
            }

            if(!(promise instanceof Promise)) {
                latestProcessedRef.current = {sequence: -1, value: promise as Result, lastDeps: dependencies};
                if(currentCallback.current!=null) currentCallback.current(promise, null);
                return [promise as Result, -1, null];
            } else {
                currentPromise.current = promise.then(val => {
                    currentPromise.current = null;
                    latestProcessedRef.current = {sequence: currSequence, value: val, lastDeps: dependencies};
                    if(currSequence!==sequence.current) return;
                    if(currentCallback.current!=null) currentCallback.current(val, null);
                    setLatestProcessed(latestProcessedRef.current);
                }).catch(err => {
                    currentPromise.current = null;
                    console.error(err);
                    latestProcessedRef.current = {sequence: currSequence, error: err, lastDeps: dependencies};
                    if(currSequence!==sequence.current) return;
                    if(currentCallback.current!=null) currentCallback.current(null, err);
                    setLatestProcessed(latestProcessedRef.current);
                });

                return [null as Result, currSequence, null];
            }
        }

        if(currentPromise.current==null || parallel) {
            return execute();
        } else {
            const _exec = () => {
                if(currSequence!==sequence.current) return;
                const [value, processedSeq, error] = execute();
                if(processedSeq===-1) setLatestProcessed(latestProcessedRef.current = {sequence: currSequence, value, error, lastDeps: dependencies});
            };
            currentPromise.current.then(_exec, _exec);
            return [null as Result, currSequence, null];
        }
    }) as () => [Result, number, any], depsRef.current);

    const [refreshCount, setRefreshCount] = useState<number>(0);

    const [_success, _loadingSequence, _error] = useMemo(() => {
        return runAction();
    }, [runAction, refreshCount]);
    const refresh = useCallback(() => setRefreshCount(val => val+1), []);

    if(latestProcessed.sequence===_loadingSequence) return [latestProcessed.value, false, latestProcessed.error, refresh];
    return [_success, _loadingSequence!==-1, _error, refresh];
}
