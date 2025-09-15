import { useCallback, useMemo, useRef, useState } from "react";
export function useWithAwait(executor, dependencies, parallel = true, callback, pause) {
    const [latestProcessed, setLatestProcessed] = useState({ sequence: 0, value: null, error: null });
    const latestProcessedRef = useRef({ sequence: 0, value: null, error: null, lastDeps: dependencies });
    const sequence = useRef(0);
    const currentPromise = useRef(null);
    const currentCallback = useRef(null);
    currentCallback.current = callback;
    const depsRef = useRef();
    useMemo(() => {
        if (pause)
            return;
        depsRef.current = dependencies;
    }, dependencies.concat([pause]));
    const runAction = useCallback((() => {
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
                if (currentCallback.current != null)
                    currentCallback.current(null, e);
                return [null, -1, e];
            }
            if (!(promise instanceof Promise)) {
                latestProcessedRef.current = { sequence: -1, value: promise, lastDeps: dependencies };
                if (currentCallback.current != null)
                    currentCallback.current(promise, null);
                return [promise, -1, null];
            }
            else {
                currentPromise.current = promise.then(val => {
                    currentPromise.current = null;
                    latestProcessedRef.current = { sequence: currSequence, value: val, lastDeps: dependencies };
                    if (currSequence !== sequence.current)
                        return;
                    if (currentCallback.current != null)
                        currentCallback.current(val, null);
                    setLatestProcessed(latestProcessedRef.current);
                }).catch(err => {
                    currentPromise.current = null;
                    console.error(err);
                    latestProcessedRef.current = { sequence: currSequence, error: err, lastDeps: dependencies };
                    if (currSequence !== sequence.current)
                        return;
                    if (currentCallback.current != null)
                        currentCallback.current(null, err);
                    setLatestProcessed(latestProcessedRef.current);
                });
                return [null, currSequence, null];
            }
        };
        if (currentPromise.current == null || parallel) {
            return execute();
        }
        else {
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
    const [_success, _loadingSequence, _error] = useMemo(() => {
        return runAction();
    }, [runAction, refreshCount]);
    const refresh = useCallback(() => setRefreshCount(val => val + 1), []);
    if (latestProcessed.sequence === _loadingSequence)
        return [latestProcessed.value, false, latestProcessed.error, refresh];
    return [_success, _loadingSequence !== -1, _error, refresh];
}
