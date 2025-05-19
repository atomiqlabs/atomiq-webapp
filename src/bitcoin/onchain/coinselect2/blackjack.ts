import {CoinselectAddressTypes, CoinselectTxInput, CoinselectTxOutput, utils} from "./utils";

// add inputs until we reach or surpass the target value (or deplete)
// worst-case: O(n)
export function blackjack (
    utxos: CoinselectTxInput[],
    outputs: CoinselectTxOutput[],
    feeRate: number,
    type: CoinselectAddressTypes,
): {
    inputs?: CoinselectTxInput[],
    outputs?: CoinselectTxOutput[],
    fee: number
} {
    if (!isFinite(utils.uintOrNaN(feeRate))) return null;

    let bytesAccum = utils.transactionBytes([], outputs, type);
    let inAccum = 0;
    let cpfpAddFee = 0;
    const inputs = [];
    const outAccum = utils.sumOrNaN(outputs);
    const threshold = utils.dustThreshold({type});

    for (let i = 0; i < utxos.length; ++i) {
        const input = utxos[i];
        const inputBytes = utils.inputBytes(input);
        let cpfpFee = 0;
        if(input.cpfp!=null && input.cpfp.txEffectiveFeeRate<feeRate) cpfpFee = input.cpfp.txVsize * (feeRate - input.cpfp.txEffectiveFeeRate);

        const fee = (feeRate * (bytesAccum + inputBytes)) + cpfpAddFee + cpfpFee;
        const inputValue = utils.uintOrNaN(input.value);

        // would it waste value?
        if ((inAccum + inputValue) > (outAccum + fee + threshold)) continue;

        bytesAccum += inputBytes;
        inAccum += inputValue;
        cpfpAddFee += cpfpFee;
        inputs.push(input);

        // go again?
        if (inAccum < outAccum + fee) continue;

        return utils.finalize(inputs, outputs, feeRate, type, cpfpAddFee);
    }

    return { fee: (feeRate * bytesAccum) + cpfpAddFee };
}
