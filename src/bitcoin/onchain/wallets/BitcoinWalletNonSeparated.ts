import {BitcoinWallet, BitcoinWalletUtxo} from "../BitcoinWallet";
import {CoinselectAddressTypes} from "@atomiqlabs/sdk";
import {filterInscriptionUtxosOnlyConfirmed} from "../InscriptionUtils";

/**
 * Bitcoin wallet with no separation between addresses holding Ordinal assets & BTC
 */
export abstract class BitcoinWalletNonSeparated extends BitcoinWallet {

    protected abstract _isOrdinalsAddress(address: string): boolean;

    protected async _getUtxoPool(
        sendingAddress: string,
        sendingAddressType: CoinselectAddressTypes
    ): Promise<BitcoinWalletUtxo[]> {
        let utxos = await super._getUtxoPool(sendingAddress, sendingAddressType);
        if(this._isOrdinalsAddress(sendingAddress)) utxos = await filterInscriptionUtxosOnlyConfirmed(utxos).catch(err => {
            console.error(err);
            return [];
        });
        return utxos;
    }

}
