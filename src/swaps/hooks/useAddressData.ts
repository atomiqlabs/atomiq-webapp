import {useContext} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {LNURLPay, LNURLWithdraw, Swapper, SwapType, TokenAmount} from "@atomiqlabs/sdk";
import {useWithAwait} from "../../utils/hooks/useWithAwait";

export type AddressDataResult = {
    address: string,
    type: string,
    swapType: SwapType,
    lnurl?: LNURLWithdraw | LNURLPay,
    min?: TokenAmount,
    max?: TokenAmount,
    amount?: TokenAmount
};

export function useAddressData(addressString: string, callback?: (result: AddressDataResult, error: Error) => void): [AddressDataResult, boolean, Error] {
    const {swapper} = useContext(SwapsContext);

    const [result, loading, error] = useWithAwait(
        () => {
            if(swapper==null || addressString==null) return null;
            return swapper.Utils.parseAddress(addressString)
        },
        [swapper, addressString],
        true,
        callback
    );

    return [result, loading, error];
}
