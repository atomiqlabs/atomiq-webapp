import {useCallback, useMemo} from "react";
import {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";
import {BitcoinWebWalletContext} from "../context/BitcoinWebWalletContext";
import {ChainsConfig} from "../data/ChainsConfig";
import {useLocalStorage} from "../hooks/utils/useLocalStorage";
import {useWithAwait} from "../hooks/utils/useWithAwait";
import {InternalBitcoinWebwallet} from "../wallets/bitcoin/InternalBitcoinWebwallet";

const MNEMONIC_STORAGE_KEY = "atomiq-btc-webwallet-mnemonic";

export function BitcoinWebWalletProvider(props: { children: React.ReactNode }) {
  const [_mnemonicPhrase, setMnemonicPhrase] = useLocalStorage<string | undefined>(
    MNEMONIC_STORAGE_KEY, undefined
  );

  const mnemonicPhrase = useMemo(() => {
    if(_mnemonicPhrase!=null) return _mnemonicPhrase;
    const generatedMnemonic = SingleAddressBitcoinWallet.generateRandomMnemonic();
    setMnemonicPhrase(generatedMnemonic);
    return generatedMnemonic;
  }, [_mnemonicPhrase]);

  const [wallet] = useWithAwait<InternalBitcoinWebwallet>(
    async () => {
      const privateKey = await SingleAddressBitcoinWallet.mnemonicToPrivateKey(
        mnemonicPhrase,
        ChainsConfig.BITCOIN.network
      );
      return new InternalBitcoinWebwallet(
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
