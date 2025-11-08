import { useEffect, useRef } from 'react';
export function useStateRef(state) {
    const ref = useRef();
    useEffect(() => {
        ref.current = state;
    }, [state]);
    return ref;
}
