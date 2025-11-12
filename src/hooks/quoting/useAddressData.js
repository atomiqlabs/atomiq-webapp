import { useContext } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import { useWithAwait } from '../utils/useWithAwait';
export function useAddressData(addressString, callback) {
    const { swapper } = useContext(SwapperContext);
    const [result, loading, error] = useWithAwait(async () => {
        if (swapper == null || addressString == null)
            return null;
        const parsed = await swapper.Utils.parseAddress(addressString);
        if (!parsed)
            throw new Error('Invalid address');
        return parsed;
    }, [swapper, addressString], true, callback);
    return [result, loading, error];
}
