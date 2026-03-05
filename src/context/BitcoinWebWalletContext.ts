import {createContext} from "react";
import {InternalBitcoinWebwallet} from "../wallets/bitcoin/InternalBitcoinWebwallet";

export const BitcoinWebWalletContext: React.Context<{
    recoverWallet: (mnemonic: string) => void,
    getMnemonicPhrase: () => string,
    wallet?: InternalBitcoinWebwallet
}> = createContext(undefined);
