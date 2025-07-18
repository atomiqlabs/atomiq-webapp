import { useEffect, useRef } from "react";

export function useAbortSignalRef(deps: any[]) {
  const controller = useRef<AbortController>();
  const signal = useRef<AbortSignal>();

  useEffect(() => {
    controller.current = new AbortController();
    signal.current = controller.current.signal;

    return () => controller.current.abort(new Error());
  }, deps);

  return signal;
}
