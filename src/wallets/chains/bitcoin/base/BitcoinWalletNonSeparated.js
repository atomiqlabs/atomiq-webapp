import { ExtensionBitcoinWallet } from "./ExtensionBitcoinWallet";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
import { getAddressUtxoSetWithoutTokens } from "../utils/UnisatTokensApi";
import { FEConstants } from "../../../../FEConstants";
/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export class BitcoinWalletNonSeparated extends ExtensionBitcoinWallet {
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        if (FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET)
            return utxos; //No utxo checking for testnets
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
