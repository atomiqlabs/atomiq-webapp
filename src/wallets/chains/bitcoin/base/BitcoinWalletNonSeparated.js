import { ExtensionBitcoinWallet } from "./ExtensionBitcoinWallet";
import { filterInscriptionUtxosOnlyConfirmed } from "../utils/InscriptionUtils";
/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export class BitcoinWalletNonSeparated extends ExtensionBitcoinWallet {
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        if (this._isOrdinalsAddress(sendingAddress))
            utxos = await filterInscriptionUtxosOnlyConfirmed(utxos).catch(err => {
                console.error(err);
                return [];
            });
        return utxos;
    }
}
