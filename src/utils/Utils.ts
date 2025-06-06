import {ISwap} from "@atomiqlabs/sdk";
import BigNumber from "bignumber.js";

export function getDeltaTextHours(delta: number): string {
    let deltaSeconds = Math.floor(delta/1000);
    if(deltaSeconds<60) {
        return deltaSeconds+" "+(deltaSeconds===1 ? "second" : "seconds");
    }
    let deltaMinutes = Math.floor(deltaSeconds/60);
    if(deltaSeconds<60*60) {
        deltaSeconds -= deltaMinutes*60;
        return deltaMinutes+" "+(deltaMinutes===1 ? "minute" : "minutes")+" & "+deltaSeconds+" "+(deltaSeconds===1 ? "second" : "seconds");
    }
    if(deltaSeconds<60*60*24) {
        const deltaHours = Math.floor(deltaMinutes/60);
        deltaMinutes -= deltaHours*60;
        return deltaHours+" "+(deltaHours===1 ? "hour" : "hours") + " & " + deltaMinutes + " " + (deltaMinutes===1 ? "minute" : "minutes");
    }
}

export function getDeltaText(delta: number): string {
    const deltaSeconds = Math.floor(delta/1000);
    if(deltaSeconds<60) {
        return deltaSeconds+" "+(deltaSeconds===1 ? "second" : "seconds");
    }
    if(deltaSeconds<60*60) {
        const deltaMinutes = Math.floor(deltaSeconds/(60));
        return deltaMinutes+" "+(deltaMinutes===1 ? "minute" : "minutes");
    }
    if(deltaSeconds<60*60*24) {
        const deltaHours = Math.floor(deltaSeconds/(60*60));
        return deltaHours+" "+(deltaHours===1 ? "hour" : "hours");
    }
    if(deltaSeconds<60*60*24*30) {
        const deltaDays = Math.floor(deltaSeconds/(60*60*24));
        return deltaDays+" "+(deltaDays===1 ? "day" : "days");
    }
    if(deltaSeconds<60*60*24*30*12) {
        const deltaMonths = Math.floor(deltaSeconds/(60*60*24*30));
        return deltaMonths+" "+(deltaMonths===1 ? "month" : "months");
    }
    const deltaYears = Math.floor(deltaSeconds/(60*60*24*30*12));
    return deltaYears+" "+(deltaYears===1 ? "year" : "years");
}

export function getTimeDeltaText(timestamp: number, forward?: boolean): string {
    const delta = forward ? timestamp-Date.now() : Date.now()-timestamp;
    const deltaSeconds = Math.floor(delta/1000);
    if(deltaSeconds<60) {
        return deltaSeconds+" "+(deltaSeconds===1 ? "second" : "seconds");
    }
    if(deltaSeconds<60*60) {
        const deltaMinutes = Math.floor(deltaSeconds/(60));
        return deltaMinutes+" "+(deltaMinutes===1 ? "minute" : "minutes");
    }
    if(deltaSeconds<60*60*24) {
        const deltaHours = Math.floor(deltaSeconds/(60*60));
        return deltaHours+" "+(deltaHours===1 ? "hour" : "hours");
    }
    if(deltaSeconds<60*60*24*30) {
        const deltaDays = Math.floor(deltaSeconds/(60*60*24));
        return deltaDays+" "+(deltaDays===1 ? "day" : "days");
    }
    if(deltaSeconds<60*60*24*30*12) {
        const deltaMonths = Math.floor(deltaSeconds/(60*60*24*30));
        return deltaMonths+" "+(deltaMonths===1 ? "month" : "months");
    }
    const deltaYears = Math.floor(deltaSeconds/(60*60*24*30*12));
    return deltaYears+" "+(deltaYears===1 ? "year" : "years");
}

export function elementInViewport(el): boolean {
    let top = el.offsetTop;
    let left = el.offsetLeft;
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    while(el.offsetParent) {
        el = el.offsetParent;
        top += el.offsetTop;
        left += el.offsetLeft;
    }

    return (
        top >= window.pageYOffset &&
        left >= window.pageXOffset &&
        (top + height) <= (window.pageYOffset + window.innerHeight) &&
        (left + width) <= (window.pageXOffset + window.innerWidth)
    );
}

//Workaround to variable returned PPM fee due to referral programme
// export function getFeePPM(swap: ISwap<any>): BN {
//     if(swap instanceof IToBTCSwap) {
//         const fee = swap.getSwapFee().amountInDstToken;
//         const feeWithoutBaseFee = fee.sub(swap.pricingInfo.satsBaseFee);
//         return feeWithoutBaseFee.mul(new BN(1000000)).div(swap.getOutAmount());
//     } else if(swap instanceof IFromBTCSwap) {
//         const fee = swap.getFee().amountInSrcToken;
//         const feeWithoutBaseFee = fee.sub(swap.pricingInfo.satsBaseFee);
//         return feeWithoutBaseFee.mul(new BN(1000000)).div(swap.getInAmountWithoutFee());
//     }
// }
export function getFeePct(swap: ISwap<any>, digits: number): bigint {
    const feeOriginal = swap.getRealSwapFeePercentagePPM();
    // console.log("Fee PPM: ", feeOriginal.toString(10));
    const feePPM = feeOriginal + (9n * (10n ** (3n-BigInt(digits))));
    // console.log("Fee PPM: ", feePPM.toString(10));
    return feePPM / (10n ** (4n-BigInt(digits))) * (10n ** (4n-BigInt(digits)));
}

export function bnEqual(a: BigNumber, b: BigNumber) {
    if(a==null && b==null) return true;
    if(a!=null && b==null) return false;
    if(a==null && b!=null) return false;
    return a.eq(b);
}

export function capitalizeFirstLetter(txt: string) {
    if(txt==null) return null;
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
}

export function timeoutPromise(timeout: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, timeout));
}
