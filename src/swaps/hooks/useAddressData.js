import { useContext } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
export function useAddressData(addressString) {
    const { swapper } = useContext(SwapsContext);
    const [result, loading, error] = useWithAwait((swapper, address) => {
        if (swapper == null)
            return Promise.resolve(null);
        return swapper.Utils.parseAddress(address);
    }, [swapper, addressString], true);
    return [result, loading, error];
}
