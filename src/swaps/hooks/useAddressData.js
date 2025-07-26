import { useContext } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { useWithAwait } from "../../utils/hooks/useWithAwait";
export function useAddressData(addressString, callback) {
    const { swapper } = useContext(SwapsContext);
    const [result, loading, error] = useWithAwait(() => {
        if (swapper == null || addressString == null)
            return null;
        return swapper.Utils.parseAddress(addressString);
    }, [swapper, addressString], true, callback);
    return [result, loading, error];
}
