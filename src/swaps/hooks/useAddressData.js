import { useContext } from 'react';
import { SwapsContext } from '../context/SwapsContext';
import { useWithAwait } from '../../utils/hooks/useWithAwait';
export function useAddressData(addressString, callback) {
    const { swapper } = useContext(SwapsContext);
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
