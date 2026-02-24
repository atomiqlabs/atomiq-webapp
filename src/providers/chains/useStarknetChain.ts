import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { wallet, WalletAccount } from 'starknet';
import { getStarknet, StarknetWindowObject } from '@starknet-io/get-starknet-core';
import { StarknetBrowserSigner } from '@atomiqlabs/chain-starknet';
import { Chain, WalletListData } from '../ChainsProvider';
import { useLocalStorage } from '../../hooks/utils/useLocalStorage';
import { timeoutPromise } from '../../utils/Utils';
import {ChainsConfig} from "../../data/ChainsConfig";
import Controller from "@cartridge/controller";

// Create the instance once, at module level
const controller = new Controller({
  defaultChainId: ChainsConfig.STARKNET?.chainId,
  lazyload: true,
  slot: "atomiq-exchange-3",
  tokens: {
    erc20: ["strk", "usdc", "eth", "wbtc"] as any
  }
});

const standardController = controller.asWalletStandard?.();
if(standardController!=null) {
  (standardController as any).disconnect = async () => {
    try {
      await controller.logout();
    } catch(e) {
      console.error("Controller logout error: ", e);
    }
    try {
      await controller.disconnect();
    } catch(e) {
      console.error("Controller disconnect error: ", e);
    }
  }
}

// Optional: for newer wallet standards support (if get-starknet uses it)
(window as any).starknet_cartridge = standardController ?? controller;

const overrideStatusText: {[walletName: string]: string} = {
  Controller: 'Social login & passkeys'
};

const usesECDSADN: {[walletId: string]: boolean} = {
  controller: false,
  braavos: true,
  argentX: true,
  keplr: true,
  okxwallet: true,
  xverse: true,
  metamask: true
};

const overrideAdditionalActions: {[walletName: string]: {icon: JSX.Element | string, text: string, onClick: () => void}[]} = {
  Controller: [
    {
      icon: "icon-connect",
      text: "Balances",
      onClick: () => {
        controller.openProfile("inventory");
      }
    }
  ]
};

const starknet = getStarknet();

function waitTillAddressPopulated(acc: WalletAccount) {
  return new Promise<void>((resolve) => {
    let interval;
    interval = setInterval(() => {
      if (
        acc.address != '0x0000000000000000000000000000000000000000000000000000000000000000' &&
        acc.address !== ''
      ) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

export function useStarknetChain(enabled: boolean): Chain<StarknetBrowserSigner> {
  const [starknetSigner, setStarknetSigner] = useState<StarknetBrowserSigner>();
  const [starknetWalletData, setStarknetWalletData] = useState<StarknetWindowObject>();
  const [defaultStarknetWallet, setStarknetAutoConnect] = useLocalStorage('starknet-wallet', null);

  const [nonInstalledWallet, setNonInstalledWallet] = useState<WalletListData[]>([]);
  const [availableWallets, setAvailableWallets] = useState<StarknetWindowObject[]>([]);

  const currentSWORef = useRef<{
    swo: StarknetWindowObject;
    listener: (accounts: string[]) => void;
  }>();

  const setWallet: (swo: StarknetWindowObject) => Promise<void> = async (
    swo: StarknetWindowObject
  ) => {
    if (currentSWORef.current != null) {
      currentSWORef.current.swo.off('accountsChanged', currentSWORef.current.listener);
      currentSWORef.current = null;
    }
    if (swo == null) {
      setStarknetSigner(null);
      setStarknetWalletData(null);
      return;
    }
    const walletAccount = await WalletAccount.connect(ChainsConfig.STARKNET?.rpcUrl, swo);
    const chainId = await wallet.requestChainId(walletAccount.walletProvider);
    console.log(`useStarknetWalletContext(): connected wallet chainId: ${chainId}, name: ${swo.name}, id: ${swo.id}`);
    if (chainId != null && ChainsConfig.STARKNET?.chainId !== chainId) {
      setStarknetSigner(null);
      setStarknetWalletData(null);
      console.log('useStarknetWalletContext(): Invalid chainId got from wallet...');
      return;
    }
    currentSWORef.current = {
      swo,
      listener: (accounts: string[]) => {
        console.log(
          'useStarknetWalletContext(): accountsChanged listener, new accounts: ',
          accounts
        );
        const starknetSigner = new StarknetBrowserSigner(walletAccount, usesECDSADN[swo.id]);
        wallet.requestChainId(walletAccount.walletProvider).then((chainId) => {
          console.log('useStarknetWalletContext(): connected wallet chainId: ', chainId);
          if (ChainsConfig.STARKNET?.chainId !== chainId) {
            setStarknetSigner(null);
          } else {
            setStarknetSigner(starknetSigner);
          }
        });
      },
    };
    swo.on('accountsChanged', currentSWORef.current.listener);

    await waitTillAddressPopulated(walletAccount);
    const starknetSigner = new StarknetBrowserSigner(walletAccount, usesECDSADN[swo.id]);
    console.log("useStarknetChain(): Using starknet signer: ", starknetSigner);
    setStarknetSigner(starknetSigner);
    setStarknetWalletData(swo);
  };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      await timeoutPromise(3000);
      const availableWallets = await starknet.getAvailableWallets();
      const discoveryWallets = await starknet.getDiscoveryWallets({exclude: availableWallets.map(val => val.id)});
      if (cancelled) return;
      setAvailableWallets(availableWallets);
      setNonInstalledWallet(
        discoveryWallets.map((w) => ({
          name: w.name,
          icon: w.icon,
          downloadLink: w.downloads[Object.keys(w.downloads)[0]],
        }))
      );
      if (defaultStarknetWallet == null) return;

      const lastConnectedWallet = await starknet.getLastConnectedWallet();
      if (cancelled) return;
      if (lastConnectedWallet != null) {
        const swo = await starknet.enable(lastConnectedWallet, { silent_mode: true });
        if (cancelled) return;
        console.log('useStarknetWalletContext(): Initial wallet connection: ', swo);
        setWallet(swo);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const _connect: (walletName: string) => Promise<void> = useCallback(
    async (walletName: string) => {
      if (availableWallets == null) return;
      const foundWallet = availableWallets.find((w) => w.name === walletName);
      if (foundWallet == null) return;
      const swo = await starknet.enable(foundWallet, { silent_mode: false });
      setStarknetAutoConnect(swo?.id);
      setWallet(swo);
    },
    [availableWallets]
  );

  const _disconnect: () => Promise<void> = useCallback(async () => {
    await starknet
      .disconnect({ clearLastWallet: true })
      .catch((e) => console.error('useStarknetWalletContext: error while disconnect', e));
    try {
      console.log("Current swo: ", currentSWORef.current.swo);
      if(currentSWORef.current.swo!=null) (currentSWORef.current.swo as any).disconnect();
    } catch(e) {
      console.warn("Error when disconnecting starknet wallet: ", e);
    }
    Object.keys(window.localStorage).forEach((val) => {
      if (val.startsWith('gsw-last-')) window.localStorage.removeItem(val);
    });
    setStarknetAutoConnect(null);
    setWallet(null);
  }, []);

  return useMemo(
    () =>
      !enabled
        ? null
        : {
            chain: {
              name: 'Starknet',
              icon: '/icons/chains/STARKNET.svg',
            },
            wallet:
              starknetWalletData == null || starknetSigner == null
                ? null
                : {
                    name: starknetWalletData.name,
                    icon:
                      typeof starknetWalletData?.icon !== 'string'
                        ? starknetWalletData?.icon?.dark
                        : starknetWalletData?.icon,
                    instance: starknetSigner,
                    address: starknetSigner.getAddress(),
                    additionalWalletActions: overrideAdditionalActions[starknetWalletData.name]
                  },
            installedWallets: availableWallets.sort((a, b) => a.name.localeCompare(b.name)).map((w) => ({
              name: w.name,
              icon: typeof w.icon === 'string' ? w.icon : w.icon.dark,
              isConnected: w.name === starknetWalletData?.name,
              overrideInstalledStatusText: overrideStatusText[w.name]
            })),
            nonInstalledWallets: nonInstalledWallet,
            chainId: 'STARKNET',
            _connectWallet: _connect,
            _disconnect,
            hasWallets: availableWallets.length > 0 || nonInstalledWallet.length > 0,
          },
    [
      starknetWalletData,
      starknetSigner,
      _connect,
      _disconnect,
      availableWallets,
      nonInstalledWallet,
    ]
  );
}
