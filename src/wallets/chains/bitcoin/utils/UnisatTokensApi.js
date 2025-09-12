import { tryWithRetries } from "@atomiqlabs/chain-solana";
const baseUrl = process.env.REACT_APP_UNISAT_API_URL ?? "https://open-api.unisat.io";
const apiKey = process.env.REACT_APP_UNISAT_API_KEY;
/**
 * Returns the set of UTXOs that don't hold any runes, ordinals, inscriptions, etc.
 *
 * @param address
 */
export async function getAddressUtxoSetWithoutTokens(address) {
    const responseBody = await tryWithRetries(async () => {
        const res = await fetch(baseUrl + "/v1/indexer/address/" + address + "/available-utxo-data?cursor=0&size=500", {
            method: "GET",
            headers: {
                Authorization: apiKey == null ? undefined : "Bearer " + apiKey
            },
            signal: AbortSignal.timeout(10 * 1000)
        });
        if (!res.ok)
            return null;
        return await res.json();
    });
    if (responseBody == null)
        return null;
    if (responseBody.code !== 0)
        return null;
    return new Set(responseBody.data.utxo.map(val => val.txid + ":" + val.vout));
}
