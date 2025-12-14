import {tryWithRetries} from "@atomiqlabs/chain-solana";

const baseUrl = import.meta.env.VITE_UNISAT_API_URL ?? "https://open-api.unisat.io";
const apiKey = import.meta.env.VITE_UNISAT_API_KEY;

type UnisatUtxo = {
  confirmations: number,
  txid: string,
  vout: number,
  satoshi: number,
  scriptType: string,
  scriptPk: string,
  codeType: number,
  address: string,
  height: number,
  idx: number,
  isOpInRBF: boolean,
  isSpent: boolean,
  inscriptionsCount: number,
  inscriptions: any[]
}

type UnisatUtxoResponse = {
  code: number,
  msg: string,
  data: {
    cursor: number,
    total: number,
    utxo: UnisatUtxo[]
  }
};

/**
 * Returns the set of UTXOs that don't hold any runes, ordinals, inscriptions, etc.
 *
 * @param address
 */
export async function getAddressUtxoSetWithoutTokens(address: string): Promise<Set<string>> {
  const responseBody: UnisatUtxoResponse = await tryWithRetries(async () => {
    const res = await fetch(baseUrl+"/v1/indexer/address/"+address+"/available-utxo-data?cursor=0&size=500", {
      method: "GET",
      headers: {
        Authorization: apiKey==null ? undefined : "Bearer "+apiKey
      },
      signal: AbortSignal.timeout(10*1000)
    });
    if(!res.ok) return null;
    return await res.json();
  });
  if(responseBody==null) return null;
  if(responseBody.code!==0) return null;
  return new Set(responseBody.data.utxo.map(val => val.txid+":"+val.vout));
}
