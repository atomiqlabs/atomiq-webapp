import {createContext} from "react";
import {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";

export const BitcoinWebWalletContext: React.Context<{
    recoverWallet: (mnemonic: string) => void,
    getMnemonicPhrase: () => string,
    wallet?: SingleAddressBitcoinWallet
}> = createContext(undefined);
