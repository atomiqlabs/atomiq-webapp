import {useContext} from "react";
import {SwapsContext} from "../../context/SwapsContext";
import {LNURLPay, LNURLWithdraw, Swapper, SwapType, TokenAmount} from "@atomiqlabs/sdk";
import {useWithAwait} from "../../utils/hooks/useWithAwait";


export function useAddressData(addressString: string): [{
    type: string,
    swapType: SwapType,
    lnurl?: LNURLWithdraw | LNURLPay,
    min?: TokenAmount,
    max?: TokenAmount
}, boolean, Error] {
    const {swapper} = useContext(SwapsContext);

    const [result, loading, error] = useWithAwait(
        (swapper: Swapper<any>, address: string) => {
            if(swapper==null) return Promise.resolve(null);
            return swapper.Utils.parseAddress(address)
        },
        [swapper, addressString],
        true
    );

    return [result, loading, error];
}
