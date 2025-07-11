import { FEConstants } from "../../../../FEConstants";
/**
 * Traverses to latest confirmed ancestor UTXOs, whose output sats are contained in the specified UTXO according to
 *  ordinal theory, with the offset and sats range.
 *
 * @warning This only works for inscriptions, not for runes
 *
 * @param utxo
 * @param satsOffset
 * @param satsRange
 *
 * @returns confirmed ancestor UTXOs or {utxo} if the UTXO is confirmed already.
 */
export async function traverseToConfirmedOrdinalInputs(utxo, satsOffset = 0, satsRange = utxo.value) {
    if (utxo.value < satsOffset + satsRange)
        throw new Error("Invalid UTXO traversal range! Offset: " + satsOffset + " range: " + satsRange + " utxo value: " + utxo.value + " utxo: " + utxo.txId + ":" + utxo.vout);
    const tx = await FEConstants.mempoolApi.getTransaction(utxo.txId);
    if (tx.status.confirmed)
        return [utxo];
    const outputSatOffsetStart = tx.vout.slice(0, utxo.vout).reduce((prev, curr) => prev + curr.value, 0) + satsOffset;
    const outputSatOffsetEnd = outputSatOffsetStart + satsRange;
    const confirmedInputs = [];
    let inputSatCounter = 0;
    for (let input of tx.vin) {
        let inputSatOffsetStart = inputSatCounter;
        inputSatCounter += input.prevout.value;
        let inputSatOffsetEnd = inputSatCounter;
        if (outputSatOffsetStart > inputSatOffsetEnd)
            continue;
        if (inputSatOffsetStart > outputSatOffsetEnd)
            continue;
        const intersectionStart = Math.max(inputSatOffsetStart, outputSatOffsetStart);
        const intersectionEnd = Math.min(inputSatOffsetEnd, outputSatOffsetEnd);
        const inputSatOffset = intersectionStart - inputSatOffsetStart;
        const inputSatRange = intersectionEnd - intersectionStart;
        if (inputSatRange === 0)
            continue;
        // console.log("Start: "+intersectionStart+" End: "+intersectionEnd);
        confirmedInputs.push(...await traverseToConfirmedOrdinalInputs({ txId: input.txid, vout: input.vout, value: input.prevout.value }, inputSatOffset, inputSatRange));
    }
    return confirmedInputs;
}
/**
 * Filters out the utxos which have an inscription, btc20, arc20, or runes attached to them, tries to also estimate
 *  if a token is assigned to a yet unconfirmed UTXO by traversing back to the last confirmed ancestor UTXOs.
 *
 * @warning This only works for inscription transfers, if there is an unconfirmed transaction creating an inscription
 *  it is not taken into account, also this doesn't yet work for runes.
 *
 * @param utxos
 * @returns filtered utxos excluding the ones with tokens assigned to it
 */
export async function filterInscriptionUtxos(utxos) {
    if (utxos.length === 0)
        return utxos;
    const utxosWithAssetSet = new Set();
    const ancestorMap = new Map();
    for (let utxo of utxos) {
        if (!utxo.confirmed) {
            try {
                const ancestorUtxos = await traverseToConfirmedOrdinalInputs(utxo);
                console.log("InscriptionUtils: filterInscriptionUtxos(): Fetched ancestors of unconfirmed utxo " + utxo.txId + ":" + utxo.vout + ", array: ", ancestorUtxos);
                ancestorUtxos.forEach(val => ancestorMap.set(val.txId + ":" + val.vout, utxo.txId + ":" + utxo.vout));
            }
            catch (e) {
                console.error(e);
                console.log("InscriptionUtils: filterInscriptionUtxos(): Failed to traverse ancestors of unconfirmed utxo " + utxo.txId + ":" + utxo.vout + ", adding to unspendable UTXOs");
                utxosWithAssetSet.add(utxo.txId + ":" + utxo.vout);
            }
        }
        else {
            ancestorMap.set(utxo.txId + ":" + utxo.vout, utxo.txId + ":" + utxo.vout);
        }
    }
    const resp = await fetch("https://api.atomiq.exchange/api/CheckBitcoinUtxos", {
        method: "POST",
        body: JSON.stringify(Array.from(ancestorMap.keys())),
        headers: { "Content-Type": "application/json" }
    });
    if (!resp.ok)
        throw new Error("Failed to filter out inscription utxos");
    const res = await resp.json();
    res.forEach(utxoWithAsset => utxosWithAssetSet.add(ancestorMap.get(utxoWithAsset)));
    console.log("InscriptionUtils: filterInscriptionUtxos(): Removing utxos from pool: ", Array.from(utxosWithAssetSet));
    return utxos.filter(utxo => !utxosWithAssetSet.has(utxo.txId + ":" + utxo.vout));
}
/**
 * Filters out the utxos which have an inscription, btc20, arc20, or runes attached to them, also filters out unconfirmed UTXO
 *  as they are not indexed yet and therefore the presence of tokens cannot be checked yet.
 *
 * @param utxos
 * @returns filtered utxos excluding unconfirmed ones and ones with tokens assigned to it
 */
export async function filterInscriptionUtxosOnlyConfirmed(utxos) {
    if (utxos.length === 0)
        return utxos;
    utxos = utxos.filter(utxo => utxo.confirmed);
    const resp = await fetch("https://api.atomiq.exchange/api/CheckBitcoinUtxos", {
        method: "POST",
        body: JSON.stringify(utxos.map(utxo => utxo.txId + ":" + utxo.vout)),
        headers: { "Content-Type": "application/json" }
    });
    if (!resp.ok)
        throw new Error("Failed to filter out inscription utxos");
    const res = await resp.json();
    const utxosWithAssetSet = new Set(res);
    console.log("InscriptionUtils: filterInscriptionUtxos(): Removing utxos from pool: ", Array.from(utxosWithAssetSet));
    return utxos.filter(utxo => !utxosWithAssetSet.has(utxo.txId + ":" + utxo.vout));
}
