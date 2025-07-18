import { MutableRefObject, useEffect, useRef } from "react";

export function useStateRef<T>(state: T): MutableRefObject<T> {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = state;
  }, [state]);
  return ref;
}
