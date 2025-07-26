import { useEffect, useRef } from "react";
export function useAbortSignalRef(deps) {
    const controller = useRef();
    const signal = useRef();
    useEffect(() => {
        controller.current = new AbortController();
        signal.current = controller.current.signal;
        return () => controller.current.abort(new Error());
    }, deps);
    return signal;
}
