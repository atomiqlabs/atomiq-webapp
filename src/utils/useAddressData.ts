import {useContext, useEffect, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {toHumanReadable} from "./Currencies";
import {fromHumanReadableString, LNURLPay, LNURLWithdraw, SwapType} from "@atomiqlabs/sdk";
import {useLocation} from "react-router-dom";
import BigNumber from "bignumber.js";
import {Tokens} from "../FEConstants";

type AddressDataResult = {
    address: string,
    isSend?: boolean,
    swapType?: SwapType,
    amount?: BigNumber,
    isLnurl?: boolean,
    lnurlResult?: LNURLWithdraw | LNURLPay,
    error?: string,
    min?: BigNumber,
    max?: BigNumber
};

export function useAddressData(addressString: string): [boolean, AddressDataResult] {
    const {swapper} = useContext(SwapsContext);

    const {state} = useLocation() as {state: any};
    const stateLnurlParams: any & {min: bigint, max: bigint} = state?.lnurlParams!=null ? {
        ...state.lnurlParams,
        min: BigInt(state.lnurlParams.min),
        max: BigInt(state.lnurlParams.max)
    } : null;

    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<AddressDataResult>();

    useEffect(() => {
        if(swapper==null) return;
        if(addressString==null || addressString==="") {
            setResult(null);
            return;
        }

        let cancelled = false;

        let resultText: string = addressString;
        if(resultText.startsWith("lightning:")) {
            resultText = resultText.substring(10);
        }
        let _amount: string = null;
        if(resultText.startsWith("bitcoin:")) {
            resultText = resultText.substring(8);
            if(resultText.includes("?")) {
                const arr = resultText.split("?");
                resultText = arr[0];
                const params = arr[1].split("&");
                for(let param of params) {
                    const arr2 = param.split("=");
                    const key = arr2[0];
                    const value = decodeURIComponent(arr2[1]);
                    if(key==="amount") {
                        _amount = value;
                    }
                }
            }
        }

        if(swapper.isValidBitcoinAddress(resultText)) {
            //On-chain send
            let amountBN: bigint = null;
            if(_amount!=null) amountBN = fromHumanReadableString(_amount, Tokens.BITCOIN.BTC);
            setResult({swapType: SwapType.TO_BTC, address: resultText, amount: toHumanReadable(amountBN, Tokens.BITCOIN.BTC), isSend: true});
        } else if(swapper.isValidLightningInvoice(resultText)) {
            //Lightning send
            const amountBN = swapper.getLightningInvoiceValue(resultText);
            setResult({swapType: SwapType.TO_BTCLN, address: resultText, amount: toHumanReadable(amountBN, Tokens.BITCOIN.BTCLN), isLnurl: false, isSend: true});
        } else if(swapper.isValidLNURL(resultText)) {
            //Check LNURL type
            const processLNURL = (result: LNURLWithdraw | LNURLPay) => {
                console.log(result);
                if(result==null) {
                    setResult({address: resultText, isLnurl: true, error: "Invalid LNURL response received!"});
                    return;
                }
                const min = result.min==null ? null : toHumanReadable(result.min, Tokens.BITCOIN.BTCLN);
                const max = result.max==null ? null : toHumanReadable(result.max, Tokens.BITCOIN.BTCLN);
                if(result.type==="pay") {
                    setResult({
                        swapType: SwapType.TO_BTCLN, address: resultText, isLnurl: true, lnurlResult: result, isSend: true,
                        amount: min!=null && max!=null && min.eq(max) ? min : null,
                        min, max
                    });
                }
                if(result.type==="withdraw") {
                    setResult({
                        swapType: SwapType.FROM_BTCLN, address: resultText, isLnurl: true, lnurlResult: result, isSend: false,
                        amount: min!=null && max!=null && min.eq(max) ? min : null,
                        min, max
                    });
                }
            };

            if(stateLnurlParams!=null) {
                console.log("LNurl params passed: ", stateLnurlParams);
                processLNURL(stateLnurlParams);
            } else {
                setResult(null);
                setLoading(true);
                swapper.getLNURLTypeAndData(resultText).then(resp => {
                    if(cancelled) return;
                    processLNURL(resp);
                    setLoading(false);
                }).catch((e) => {
                    if(cancelled) return;
                    setResult({address: resultText, isLnurl: true, error: "Failed to contact LNURL service, check your internet connection and retry later."});
                    setLoading(false);
                });
            }
        } else {
            setResult({address: resultText, error: "Invalid address, lightning invoice or LNURL!"});
        }

        return () => {
            cancelled = true;
            setLoading(false);
        };
    }, [addressString, swapper]);

    return [loading, result];
}
