import { useMemo, useRef } from 'react';
export function useStateRef(state) {
    const ref = useRef();
    useMemo(() => {
        ref.current = state;
    }, [state]);
    return ref;
}
