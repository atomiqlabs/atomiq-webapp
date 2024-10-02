// baseline estimates, used to improve performance
const TX_EMPTY_SIZE = 4 + 1 + 1 + 4;
const TX_INPUT_BASE = 32 + 4 + 1 + 4;

const WITNESS_OVERHEAD = 2/4;

const P2WPKH_WITNESS = (1+1+72+1+33)/4;
const P2TR_WITNESS = (1+1+65)/4;

const TX_INPUT_PUBKEYHASH = 107;
const TX_INPUT_P2SH_P2WPKH = 23 + P2WPKH_WITNESS + 1;
const TX_INPUT_P2WPKH = 0 + P2WPKH_WITNESS;
const TX_INPUT_P2WSH = 0 + (1+1+64)/4;
const TX_INPUT_P2TR = 0 + P2TR_WITNESS;

const TX_OUTPUT_BASE = 8 + 1;

const TX_OUTPUT_PUBKEYHASH = 25;
const TX_OUTPUT_P2SH_P2WPKH = 23;
const TX_OUTPUT_P2WPKH = 22;
const TX_OUTPUT_P2WSH = 34;
const TX_OUTPUT_P2TR = 34;

export type CoinselectAddressTypes = "p2sh-p2wpkh" | "p2wpkh" | "p2wsh" | "p2tr" | "p2pkh";

export type CoinselectTxInput = {
    script?: Buffer,
    txId: string,
    vout: number,
    type?: CoinselectAddressTypes,
    value: number,
    outputScript?: Buffer,
    address?: string,
    cpfp?: {
        txVsize: number,
        txEffectiveFeeRate: number
    }
};

export type CoinselectTxOutput = {
    script?: Buffer,
    address?: string,
    type?: CoinselectAddressTypes,
    value: number
};


const INPUT_BYTES = {
    "p2sh-p2wpkh": TX_INPUT_P2SH_P2WPKH,
    "p2wpkh": TX_INPUT_P2WPKH,
    "p2tr": TX_INPUT_P2TR,
    "p2pkh": TX_INPUT_PUBKEYHASH,
    "p2wsh": TX_INPUT_P2WSH
};

function inputBytes (input: {
    script?: Buffer,
    type?: CoinselectAddressTypes
}) {
  return TX_INPUT_BASE + (input.script ? input.script.length : INPUT_BYTES[input.type]);
}

const OUTPUT_BYTES = {
    "p2sh-p2wpkh": TX_OUTPUT_P2SH_P2WPKH,
    "p2wpkh": TX_OUTPUT_P2WPKH,
    "p2tr": TX_OUTPUT_P2TR,
    "p2pkh": TX_OUTPUT_PUBKEYHASH,
    "p2wsh": TX_OUTPUT_P2WSH
};

function outputBytes (output: {
    script?: Buffer,
    type?: CoinselectAddressTypes
}): number {
  return TX_OUTPUT_BASE + (output.script ? output.script.length : OUTPUT_BYTES[output.type]);
}

export const DUST_THRESHOLDS = {
    "p2sh-p2wpkh": 540,
    "p2wpkh": 294,
    "p2tr": 330,
    "p2pkh": 546,
    "p2wsh": 330
};

function dustThreshold (output: {
    script?: Buffer,
    type: CoinselectAddressTypes
}): number {
  return DUST_THRESHOLDS[output.type];
}

function transactionBytes (
    inputs: {
        script?: Buffer,
        type?: CoinselectAddressTypes
    }[],
    outputs: {
        script?: Buffer,
        type?: CoinselectAddressTypes
    }[],
    changeType: CoinselectAddressTypes
): number {
    let size = TX_EMPTY_SIZE;
    let isSegwit = false;
    if(changeType!=="p2pkh") {
        size += WITNESS_OVERHEAD;
        let isSegwit = true;
    }
    for(let input of inputs) {
        if(!isSegwit && (input.type!=="p2pkh")) {
          isSegwit = true;
          size += WITNESS_OVERHEAD;
        }
        size += inputBytes(input);
    }
    for(let output of outputs) {
        size += outputBytes(output);
    }
    return Math.ceil(size);
}

function uintOrNaN(v: number): number {
  if (typeof v !== 'number') return NaN;
  if (!isFinite(v)) return NaN;
  if (Math.floor(v) !== v) return NaN;
  if (v < 0) return NaN;
  return v;
}

function sumForgiving(range: {value: number}[]): number {
  return range.reduce((a, x) => a + (isFinite(x.value) ? x.value : 0), 0);
}

function sumOrNaN(range: {value: number}[]): number {
  return range.reduce((a, x)  => a + uintOrNaN(x.value), 0);
}

function finalize(
    inputs: CoinselectTxInput[],
    outputs: CoinselectTxOutput[],
    feeRate: number,
    changeType: CoinselectAddressTypes,
    cpfpAddFee: number = 0
): {
    inputs?: CoinselectTxInput[],
    outputs?: CoinselectTxOutput[],
    fee: number
} {
  const bytesAccum = transactionBytes(inputs, outputs, changeType);

  const feeAfterExtraOutput = (feeRate * (bytesAccum + outputBytes({type: changeType}))) + cpfpAddFee;
  const remainderAfterExtraOutput = sumOrNaN(inputs) - (sumOrNaN(outputs) + feeAfterExtraOutput)

  // is it worth a change output?
  if (remainderAfterExtraOutput >= dustThreshold({type: changeType})) {
    outputs = outputs.concat({ value: remainderAfterExtraOutput, type: changeType })
  }

  const fee = sumOrNaN(inputs) - sumOrNaN(outputs)
  if (!isFinite(fee)) return { fee: (feeRate * bytesAccum) + cpfpAddFee }

  return {
    inputs: inputs,
    outputs: outputs,
    fee: fee
  }
}

export const utils = {
  dustThreshold: dustThreshold,
  finalize: finalize,
  inputBytes: inputBytes,
  outputBytes: outputBytes,
  sumOrNaN: sumOrNaN,
  sumForgiving: sumForgiving,
  transactionBytes: transactionBytes,
  uintOrNaN: uintOrNaN
};
