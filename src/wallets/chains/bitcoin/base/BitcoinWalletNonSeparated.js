import { ExtensionBitcoinWallet } from "./ExtensionBitcoinWallet";
import { getAddressUtxoSetWithoutTokens } from "../utils/UnisatTokensApi";
/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export class BitcoinWalletNonSeparated extends ExtensionBitcoinWallet {
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        if (this._isOrdinalsAddress(sendingAddress) && utxos.length > 0) {
            const utxosWithoutTokens = await getAddressUtxoSetWithoutTokens(sendingAddress).catch(err => {
                console.error("BitcoinWalletNonSeparated: _getUtxoPool(): Failed to check UTXOs without tokens, error: ", err);
                return null;
            });
            if (utxosWithoutTokens == null)
                return [];
            utxos = utxos.filter(val => utxosWithoutTokens.has(val.txId + ":" + val.vout));
        }
        return utxos;
    }
}
