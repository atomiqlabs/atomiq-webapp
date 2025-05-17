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
    pause?: boolean,
    verbose?: boolean
): [Result, boolean, any, () => void] {

    const [latestProcessed, setLatestProcessed] = useState<AwaitLatestProcessedState<Result>>({sequence: 0, value: null, error: null});
    const latestProcessedRef = useRef<AwaitLatestProcessedState<Result> & {lastDeps: any[]}>({sequence: 0, value: null, error: null, lastDeps: dependencies});
    const sequence = useRef<number>(0);
    const currentPromise = useRef<Promise<void>>(null);

    const depsRef = useRef<any[]>();
    useMemo(() => {
        if(pause) return;
        depsRef.current = dependencies;
    }, dependencies.concat([pause]));

    const runAction = useCallback<(manual: boolean) => [Result, number, any]>(((manual: boolean) => {
        if(verbose) console.log("useWithAwait(): runAction(): ", dependencies);

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
                if(callback!=null) callback(null, e);
                return [null as Result, -1, e];
            }

            if(!(promise instanceof Promise)) {
                if(verbose) console.log("useWithAwait(): Sync: "+currSequence);
                latestProcessedRef.current = {sequence: -1, value: promise as Result, lastDeps: dependencies};
                if(callback!=null) callback(promise, null);
                return [promise as Result, -1, null];
            } else {
                if(verbose) console.log("useWithAwait(): Async: "+currSequence);
                currentPromise.current = promise.then(val => {
                    currentPromise.current = null;
                    latestProcessedRef.current = {sequence: currSequence, value: val, lastDeps: dependencies};
                    if(verbose) console.log("useWithAwait(): Async success "+currSequence+"/"+sequence.current);
                    if(currSequence!==sequence.current) return;
                    if(callback!=null) callback(val, null);
                    setLatestProcessed(latestProcessedRef.current);
                }).catch(err => {
                    currentPromise.current = null;
                    console.error(err);
                    latestProcessedRef.current = {sequence: currSequence, error: err, lastDeps: dependencies};
                    if(verbose) console.log("useWithAwait(): Async failed "+currSequence+"/"+sequence.current);
                    if(currSequence!==sequence.current) return;
                    if(callback!=null) callback(null, err);
                    setLatestProcessed(latestProcessedRef.current);
                });

                return [null as Result, currSequence, null];
            }
        }

        if(currentPromise.current==null || parallel) {
            if(verbose) console.log("useWithAwait(): Execute immediately: "+currSequence);
            return execute();
        } else {
            if(verbose) console.log("useWithAwait(): Execute deferred: "+currSequence);
            const _exec = () => {
                if(currSequence!==sequence.current) return;
                const [value, processedSeq, error] = execute();
                if(processedSeq===-1) setLatestProcessed(latestProcessedRef.current = {sequence: currSequence, value, error, lastDeps: dependencies});
            };
            currentPromise.current.then(_exec, _exec);
            return [null as Result, currSequence, null];
        }
    }) as (manual: boolean) => [Result, number, any], depsRef.current);

    const [refreshCount, setRefreshCount] = useState<number>(0);
    const lastRefreshCountRef = useRef<number>(0);

    const [_success, _loadingSequence, _error] = useMemo(() => {
        const val = runAction(refreshCount!==lastRefreshCountRef.current);
        lastRefreshCountRef.current = refreshCount;
        return val;
    }, [runAction, refreshCount]);
    const refresh = useCallback(() => setRefreshCount(val => val+1), []);

    if(verbose) console.log("useWithAwait(): Latest loaded: "+latestProcessed.sequence+" Loading sequence: "+_loadingSequence);

    if(latestProcessed.sequence===_loadingSequence) return [latestProcessed.value, false, latestProcessed.error, refresh];
    return [_success, _loadingSequence!==-1, _error, refresh];
}
