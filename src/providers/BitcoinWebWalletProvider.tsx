import {useCallback, useMemo, useState} from "react";
import {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";
import {SendBitcoinToAddressModal} from "../components/modals/SendBitcoinToAddressModal";
import {BitcoinWebWalletContext} from "../context/BitcoinWebWalletContext";
import {ChainsConfig} from "../data/ChainsConfig";
import {useLocalStorage} from "../hooks/utils/useLocalStorage";
import {useWithAwait} from "../hooks/utils/useWithAwait";
import {InternalBitcoinWebwallet} from "../wallets/bitcoin/InternalBitcoinWebwallet";

const MNEMONIC_STORAGE_KEY = "atomiq-btc-webwallet-mnemonic";

export function BitcoinWebWalletProvider(props: { children: React.ReactNode }) {
  const [mnemonicPhraseState, setMnemonicPhrase] = useLocalStorage<string | undefined>(
    MNEMONIC_STORAGE_KEY, undefined
  );

  const mnemonicPhrase = useMemo(() => {
    if (mnemonicPhraseState != null) return mnemonicPhraseState;
    const generatedMnemonic = SingleAddressBitcoinWallet.generateRandomMnemonic();
    setMnemonicPhrase(generatedMnemonic);
    return generatedMnemonic;
  }, [mnemonicPhraseState]);

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

  const [sendToAddressModalOpen, setSendToAddressModalOpen] = useState<boolean>(false);

  const openSendToAddressModal = useCallback(() => {
    setSendToAddressModalOpen(true);
  }, []);

  const closeSendToAddressModal = useCallback(() => {
    setSendToAddressModalOpen(false);
  }, []);

  const getMnemonicPhrase = useCallback(() => mnemonicPhrase, [mnemonicPhrase]);

  const value = useMemo(() => ({
    recoverWallet: setMnemonicPhrase,
    getMnemonicPhrase,
    openSendToAddressModal,
    wallet
  }), [setMnemonicPhrase, getMnemonicPhrase, openSendToAddressModal, wallet]);

  return (
    <BitcoinWebWalletContext.Provider value={value}>
      <SendBitcoinToAddressModal
        opened={sendToAddressModalOpen}
        close={closeSendToAddressModal}
        wallet={wallet}
      />
      {props.children}
    </BitcoinWebWalletContext.Provider>
  );
}
