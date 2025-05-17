import { useCallback, useMemo, useRef, useState } from "react";
export function useWithAwait(executor, dependencies, parallel = true, callback, pause, verbose) {
    const [latestProcessed, setLatestProcessed] = useState({ sequence: 0, value: null, error: null });
    const latestProcessedRef = useRef({ sequence: 0, value: null, error: null, lastDeps: dependencies });
    const sequence = useRef(0);
    const currentPromise = useRef(null);
    const depsRef = useRef();
    useMemo(() => {
        if (pause)
            return;
        depsRef.current = dependencies;
    }, dependencies.concat([pause]));
    const runAction = useCallback(((manual) => {
        if (verbose)
            console.log("useWithAwait(): runAction(): ", dependencies);
        sequence.current++;
        const currSequence = sequence.current;
        const execute = () => {
            currentPromise.current = null;
            let promise = null;
            try {
                promise = executor();
            }
            catch (e) {
                console.error(e);
                latestProcessedRef.current = { sequence: -1, error: e, lastDeps: dependencies };
                if (callback != null)
                    callback(null, e);
                return [null, -1, e];
            }
            if (!(promise instanceof Promise)) {
                if (verbose)
                    console.log("useWithAwait(): Sync: " + currSequence);
                latestProcessedRef.current = { sequence: -1, value: promise, lastDeps: dependencies };
                if (callback != null)
                    callback(promise, null);
                return [promise, -1, null];
            }
            else {
                if (verbose)
                    console.log("useWithAwait(): Async: " + currSequence);
                currentPromise.current = promise.then(val => {
                    currentPromise.current = null;
                    latestProcessedRef.current = { sequence: currSequence, value: val, lastDeps: dependencies };
                    if (verbose)
                        console.log("useWithAwait(): Async success " + currSequence + "/" + sequence.current);
                    if (currSequence !== sequence.current)
                        return;
                    if (callback != null)
                        callback(val, null);
                    setLatestProcessed(latestProcessedRef.current);
                }).catch(err => {
                    currentPromise.current = null;
                    console.error(err);
                    latestProcessedRef.current = { sequence: currSequence, error: err, lastDeps: dependencies };
                    if (verbose)
                        console.log("useWithAwait(): Async failed " + currSequence + "/" + sequence.current);
                    if (currSequence !== sequence.current)
                        return;
                    if (callback != null)
                        callback(null, err);
                    setLatestProcessed(latestProcessedRef.current);
                });
                return [null, currSequence, null];
            }
        };
        if (currentPromise.current == null || parallel) {
            if (verbose)
                console.log("useWithAwait(): Execute immediately: " + currSequence);
            return execute();
        }
        else {
            if (verbose)
                console.log("useWithAwait(): Execute deferred: " + currSequence);
            const _exec = () => {
                if (currSequence !== sequence.current)
                    return;
                const [value, processedSeq, error] = execute();
                if (processedSeq === -1)
                    setLatestProcessed(latestProcessedRef.current = { sequence: currSequence, value, error, lastDeps: dependencies });
            };
            currentPromise.current.then(_exec, _exec);
            return [null, currSequence, null];
        }
    }), depsRef.current);
    const [refreshCount, setRefreshCount] = useState(0);
    const lastRefreshCountRef = useRef(0);
    const [_success, _loadingSequence, _error] = useMemo(() => {
        const val = runAction(refreshCount !== lastRefreshCountRef.current);
        lastRefreshCountRef.current = refreshCount;
        return val;
    }, [runAction, refreshCount]);
    const refresh = useCallback(() => setRefreshCount(val => val + 1), []);
    if (verbose)
        console.log("useWithAwait(): Latest loaded: " + latestProcessed.sequence + " Loading sequence: " + _loadingSequence);
    if (latestProcessed.sequence === _loadingSequence)
        return [latestProcessed.value, false, latestProcessed.error, refresh];
    return [_success, _loadingSequence !== -1, _error, refresh];
}
