import { ExtensionBitcoinWallet } from "./ExtensionBitcoinWallet";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
import { filterInscriptionUtxosOnlyConfirmed } from "../utils/InscriptionUtils";
import { FEConstants } from "../../../../FEConstants";
/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export class BitcoinWalletNonSeparated extends ExtensionBitcoinWallet {
    async _getUtxoPool(sendingAddress, sendingAddressType) {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        if (FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET)
            return utxos; //No utxo checking for testnets
        if (this._isOrdinalsAddress(sendingAddress))
            utxos = await filterInscriptionUtxosOnlyConfirmed(utxos).catch(err => {
                console.error(err);
                return [];
            });
        return utxos;
    }
}
