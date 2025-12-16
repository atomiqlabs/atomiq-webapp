import { ExtensionBitcoinWallet } from './ExtensionBitcoinWallet';
import { BitcoinWalletUtxo, CoinselectAddressTypes } from '@atomiqlabs/sdk';
import { getAddressUtxoSetWithoutTokens } from "../utils/UnisatTokensApi";
import {NETWORK} from "@scure/btc-signer";

/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export abstract class BitcoinWalletNonSeparated extends ExtensionBitcoinWallet {
  protected abstract _isOrdinalsAddress(address: string): boolean;

  protected async _getUtxoPool(
    sendingAddress: string,
    sendingAddressType: CoinselectAddressTypes
  ): Promise<BitcoinWalletUtxo[]> {
    let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
    if(this.network!==NETWORK) return utxos; //No utxo checking for testnets
    if(this._isOrdinalsAddress(sendingAddress) && utxos.length>0) {
      try {
        const utxosWithoutTokens: Set<string> = await getAddressUtxoSetWithoutTokens(sendingAddress);
        if(utxosWithoutTokens==null) return [];
        utxos = utxos.filter(val => utxosWithoutTokens.has(val.txId+":"+val.vout));
      } catch (err) {
        console.error("BitcoinWalletNonSeparated: _getUtxoPool(): Failed to check UTXOs without tokens, error: ", err);
        return [];
      }
    }
    return utxos;
  }
}
