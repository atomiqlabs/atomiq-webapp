import { useContext, useEffect, useMemo, useState } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
export function useSupportedTokens() {
    const { swapper } = useContext(SwapperContext);
    const [updateCount, setUpdateCount] = useState(0);
    useEffect(() => {
        if (swapper == null)
            return;
        const listener = () => {
            setUpdateCount((val) => val + 1);
        };
        swapper.on('lpsRemoved', listener);
        swapper.on('lpsAdded', listener);
        return () => {
            swapper.removeListener('lpsRemoved', listener);
            swapper.removeListener('lpsAdded', listener);
        };
    }, [swapper]);
    return useMemo(() => {
        return [swapper?.getSupportedTokens(true), swapper?.getSupportedTokens(false)];
    }, [swapper, updateCount]);
}
