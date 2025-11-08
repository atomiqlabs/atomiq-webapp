import { useCallback, useRef, useState } from 'react';

export function useAsync<Args extends any[], Result>(
  executor: (...args: Args) => Promise<Result>,
  deps: any[]
): [(...args: Args) => Promise<Result>, boolean, Result, any] {
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<Result>(null);
  const [error, setError] = useState<any>(null);
  const executingRef = useRef<boolean>(null);

  const fn = useCallback((...args: Args) => {
    if (executingRef.current) return Promise.resolve(null);
    const maybePromise = executor(...args);
    if (maybePromise == null) return Promise.resolve(null);
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
        console.error('useAsync(): ', err);
        executingRef.current = false;
        setLoading(false);
        setError(err);
      });
  }, deps);

  return [fn, loading, success, error];
}
