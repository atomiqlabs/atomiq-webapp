import {MutableRefObject, useMemo, useRef} from 'react';

export function useStateRef<T>(state: T): MutableRefObject<T> {
  const ref = useRef<T>();
  useMemo(() => {
    ref.current = state;
  }, [state]);
  return ref;
}
