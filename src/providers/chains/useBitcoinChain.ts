import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { useLocalStorage } from '../../hooks/utils/useLocalStorage';
import { useStateRef } from '../../hooks/utils/useStateRef';
import { Chain } from '../ChainsProvider';
import {ExtensionBitcoinWallet} from "../../wallets/bitcoin/base/ExtensionBitcoinWallet";
import {BitcoinWalletType, getInstalledBitcoinWallets} from "../../wallets/bitcoin/utils/BitcoinWalletUtils";
import {Chains} from "../../utils/Chains";
import { IBitcoinWallet } from '@atomiqlabs/sdk';
import { useIntermediateBitcoinWallet } from '../../hooks/wallets/useIntermediateBitcoinWallet';
import {WalletBalanceCallbackResult} from "../../hooks/wallets/useWalletBalance";

type BitcoinWalletState = {
    wallet: IBitcoinWallet;
    wasAutomaticallyConnected: boolean;
    icon: string;
    name: string;
    onlyInput?: boolean;
    getBalance?: () => Promise<WalletBalanceCallbackResult>
    additionalWalletActions?: {
      icon: JSX.Element | string;
      text: string;
      onClick: () => void;
    }[];
    cannotDisconnect?: boolean;
}

function wrapExtensionWallet(wallet: ExtensionBitcoinWallet): BitcoinWalletState {
    return {
        wallet,
        wasAutomaticallyConnected: wallet.wasAutomaticallyInitiated,
        name: wallet.getName(),
        icon: wallet.getIcon()
    };
}

export function useBitcoinChain(
  enabled: boolean,
  connectedOtherChainWallets: { [chainName: string]: string }
): Chain<IBitcoinWallet> {
  const intermediateWallet = useIntermediateBitcoinWallet();
  const [bitcoinWallet, setBitcoinWallet] = React.useState<BitcoinWalletState>(undefined);
  const [nonInstalledWallets, setNonInstalledWallets] = useState<BitcoinWalletType[]>([]);
  const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[] | null>(null);

  const [autoConnect, setAutoConnect] = useLocalStorage<boolean>('btc-wallet-autoconnect', true);
  const bitcoinWalletRef = useStateRef(bitcoinWallet);

  const prevConnectedWalletRef = useRef<{ [chainName: string]: string }>({});
  useEffect(() => {
    if (!enabled) return;
    for (let chainName in connectedOtherChainWallets) {
      const oldWalletName = prevConnectedWalletRef.current[chainName];
      const newWalletName = connectedOtherChainWallets[chainName];
      if (prevConnectedWalletRef.current[chainName] == connectedOtherChainWallets[chainName])
        continue;
      const activeWallet = ExtensionBitcoinWallet.loadState();
      if (oldWalletName != null && newWalletName == null && activeWallet?.name === oldWalletName) {
        setAutoConnect(true);
        if (
            bitcoinWalletRef.current != null &&
            bitcoinWalletRef.current.wasAutomaticallyConnected
        ) disconnect(true);
      }
      prevConnectedWalletRef.current[chainName] = newWalletName;
      if (newWalletName == null) continue;
      if (!autoConnect) continue;
      if (usableWallets == null) continue;
      if (activeWallet == null) {
        const bitcoinWalletType = usableWallets.find(
          (walletType) => walletType.name === newWalletName
        );
        console.log(
          'useBitcoinWalletData(): useEffect(autoconnect): found matching bitcoin wallet: ',
          bitcoinWalletType
        );
        if (bitcoinWalletType != null)
          bitcoinWalletType
            .use({ multichainConnected: true })
            .then((wallet) => activeWallet==null && setBitcoinWallet(wrapExtensionWallet(wallet)))
            .catch((e) => {
              console.error(e);
            });
        return;
      }
    }
  }, [connectedOtherChainWallets, usableWallets]);

  const intermediateWalletBalance = (intermediateWallet.confirmedBalance ?? 0n) + (intermediateWallet.unconfirmedBalance ?? 0n);
  const intermediateWalletObject: BitcoinWalletState | undefined = useMemo(() => intermediateWallet.wallet==null ? undefined : ({
    name: 'Intermediate wallet',
    icon: '/icons/chains/BITCOIN.svg',
    wallet: intermediateWallet.wallet,
    wasAutomaticallyConnected: false,
    onlyInput: true,
    getBalance: async () => {
      const rawBalance = await intermediateWallet.refreshBalance();
      if (rawBalance == null) return {balance: undefined};
      return {
        balance: undefined,
        displayBalance: rawBalance.confirmedBalance + rawBalance.unconfirmedBalance
      };
    },
    additionalWalletActions: [
      {
        icon: 'icon-file-text',
        text: 'Back up wallet',
        onClick: intermediateWallet.openMnemonicBackupModal,
      },
      {
        icon: 'icon-send-claim',
        text: 'Send Bitcoin',
        onClick: intermediateWallet.openSendBitcoinModal,
      },
    ],
    cannotDisconnect: true
  }), [
    intermediateWallet.wallet,
    intermediateWallet.refreshBalance,
    intermediateWallet.openMnemonicBackupModal,
    intermediateWallet.openSendBitcoinModal
  ]);

  const tryConnectIntermediateWallet = useCallback(() => {
    if (intermediateWalletBalance===0n) {
      if(bitcoinWalletRef.current?.name==="Intermediate wallet") {
        disconnect(undefined, true);
      }
      return;
    }
    if (intermediateWalletObject==null) return;
    setBitcoinWallet(intermediateWalletObject);
  }, [intermediateWalletBalance, intermediateWalletObject]);

  //Fires on initial usable wallets load
  useEffect(() => {
    if (!usableWallets) return;
    tryConnectIntermediateWallet();
  }, [
    usableWallets,
    intermediateWalletBalance,
    tryConnectIntermediateWallet
  ]);

  //Fires when bitcoin wallet is disconnected
  useEffect(() => {
    if (!usableWallets) return;
    if (bitcoinWallet) return;
    tryConnectIntermediateWallet();
  }, [
    bitcoinWallet,
    tryConnectIntermediateWallet
  ]);

  useEffect(() => {
    if (!enabled) return;
    getInstalledBitcoinWallets()
      .then((resp) => {
        if (resp.active != null && bitcoinWallet == null) {
          resp
            .active()
            .then((wallet) => setBitcoinWallet(wrapExtensionWallet(wallet)))
            .catch((e) => {
              console.error(e);
            })
            .finally(() => {
              setUsableWallets(resp.installed);
              setNonInstalledWallets(resp.installable);
            });
        } else {
          setUsableWallets(resp.installed);
          setNonInstalledWallets(resp.installable);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const wallet = bitcoinWallet?.wallet;
    if (wallet == null || !(wallet instanceof ExtensionBitcoinWallet)) return;
    let listener: (newWallet: ExtensionBitcoinWallet) => void;
      wallet.onWalletChanged(
      (listener = (newWallet: ExtensionBitcoinWallet) => {
        console.log(
          'useBitcoinWalletData(): useEffect(walletChangeListener): New bitcoin wallet set: ',
          newWallet
        );
        if (newWallet == null) {
          ExtensionBitcoinWallet.clearState();
          setBitcoinWallet(undefined);
          return;
        }
        if (wallet.getReceiveAddress() === newWallet.getReceiveAddress()) return;
        setBitcoinWallet(wrapExtensionWallet(newWallet));
      })
    );
    return () => {
        wallet.offWalletChanged(listener);
    };
  }, [bitcoinWallet]);

  const connectWallet: (bitcoinWalletType: BitcoinWalletType) => Promise<void> = useCallback(
    async (bitcoinWalletType: BitcoinWalletType) => {
      const wallet = await bitcoinWalletType.use();
      return setBitcoinWallet(wrapExtensionWallet(wallet));
    },
    []
  );

  const disconnect: (skipToggleAutoConnect?: boolean, force?: boolean) => void = useCallback(
    (skipToggleAutoConnect?: boolean, force?: boolean) => {
      if (
        skipToggleAutoConnect !== true &&
        bitcoinWalletRef.current != null &&
        bitcoinWalletRef.current.wasAutomaticallyConnected
      ) setAutoConnect(false);

      if(!force && bitcoinWalletRef.current?.cannotDisconnect) return;

      ExtensionBitcoinWallet.clearState();
      setBitcoinWallet(undefined);
    },
    []
  );

  const connect = useCallback(
    (walletName: string) => {
      if (usableWallets == null) return;
      const foundWallet = usableWallets.find((w) => w.name === walletName);
      if (foundWallet == null) return;
      return connectWallet(foundWallet).catch((e) => {
        // Re-throw error so it can be handled by the caller
        throw e;
      });
    },
    [usableWallets]
  );

  return useMemo(
    () => {
      if (!enabled) return null;

      return {
        chain: Chains.BITCOIN,
        wallet:
          bitcoinWallet != null
            ? {
                name: bitcoinWallet.name,
                icon: bitcoinWallet.icon,
                instance: bitcoinWallet.wallet,
                address: bitcoinWallet.wallet.getReceiveAddress(),
                onlyInput: bitcoinWallet.onlyInput,
                getBalance: bitcoinWallet.getBalance,
                additionalWalletActions: bitcoinWallet.additionalWalletActions,
                cannotDisconnect: bitcoinWallet.cannotDisconnect
              }
            : null,
        installedWallets: (usableWallets ?? []).map((w) => ({
          name: w.name,
          icon: w.iconUrl,
          isConnected: w.name === bitcoinWallet?.name,
        })),
        nonInstalledWallets: nonInstalledWallets.map((w) => ({
          name: w.name,
          icon: w.iconUrl,
          downloadLink: w.installUrl,
        })),
        chainId: 'BITCOIN',
        _connectWallet: connect,
        _disconnect: bitcoinWallet != null ? disconnect : null,
        hasWallets: usableWallets?.length > 0 || nonInstalledWallets.length > 0,
      };
    },
    [bitcoinWallet, usableWallets, nonInstalledWallets, connect, disconnect]
  );
}
