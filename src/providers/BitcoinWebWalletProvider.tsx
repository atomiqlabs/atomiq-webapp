import {useCallback, useMemo} from "react";
import {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";
import {BitcoinWebWalletContext} from "../context/BitcoinWebWalletContext";
import {ChainsConfig} from "../data/ChainsConfig";
import {useLocalStorage} from "../hooks/utils/useLocalStorage";
import {useWithAwait} from "../hooks/utils/useWithAwait";

const MNEMONIC_STORAGE_KEY = "atomiq-btc-webwallet-mnemonic";

export function BitcoinWebWalletProvider(props: { children: React.ReactNode }) {
  const [mnemonicPhrase, setMnemonicPhrase] = useLocalStorage<string>(
    MNEMONIC_STORAGE_KEY,
    SingleAddressBitcoinWallet.generateRandomMnemonic()
  );

  const [wallet] = useWithAwait<SingleAddressBitcoinWallet>(
    async () => {
      const privateKey = await SingleAddressBitcoinWallet.mnemonicToPrivateKey(
        mnemonicPhrase,
        ChainsConfig.BITCOIN.network
      );
      return new SingleAddressBitcoinWallet(
        ChainsConfig.BITCOIN.rpc,
        ChainsConfig.BITCOIN.network,
        privateKey
      );
    },
    [mnemonicPhrase],
    true
  );

  const getMnemonicPhrase = useCallback(() => mnemonicPhrase, [mnemonicPhrase]);

  const value = useMemo(() => ({
    recoverWallet: setMnemonicPhrase,
    getMnemonicPhrase,
    wallet
  }), [setMnemonicPhrase, getMnemonicPhrase, wallet]);

  return (
    <BitcoinWebWalletContext.Provider value={value}>
      {props.children}
    </BitcoinWebWalletContext.Provider>
  );
}
