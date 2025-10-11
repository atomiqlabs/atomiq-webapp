/**
 * Generic Chain Wallet Hook
 *
 * This hook implements common wallet management logic for all chains.
 * Chain-specific behavior is provided through ChainConfig dependency injection.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChainConfig, WalletDescriptor } from '../types/ChainConfig';
import { StandardChainHookResult, ChainWalletOption } from '../types/ChainHookTypes';
import { ChainWalletData } from '../ChainDataProvider';

export interface UseGenericChainWalletOptions {
  /**
   * Connected wallets from other chains (for dependency-based auto-connect)
   * Map of chainId -> walletName
   */
  connectedWallets?: Record<string, string>;
}

/**
 * Generic hook for managing chain wallets
 *
 * @param config - Chain configuration with dependency-injected functions
 * @param options - Optional configuration
 * @returns StandardChainHookResult
 */
export function useGenericChainWallet<TWalletInstance, TSigner, TDetectionData = any>(
  config: ChainConfig<TWalletInstance, TSigner, TDetectionData>,
  options: UseGenericChainWalletOptions = {}
): StandardChainHookResult<TSigner> {
  // ========== State ==========
  const [wallet, setWallet] = useState<TWalletInstance | null>(null);
  const [installedWallets, setInstalledWallets] = useState<WalletDescriptor<TDetectionData>[]>([]);
  const [installableWallets, setInstallableWallets] = useState<WalletDescriptor<TDetectionData>[]>(
    []
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref to track previous dependency state
  const prevDependenciesRef = useRef<Record<string, string>>({});

  // ========== Wallet Detection (on mount) ==========
  useEffect(() => {
    config
      .detectWallets()
      .then((result) => {
        setInstalledWallets(result.installed);
        setInstallableWallets(result.installable);
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error(`[${config.id}] Failed to detect wallets:`, error);
        setIsInitialized(true);
      });
  }, [config]);

  // ========== Auto-Connect (on mount) ==========
  useEffect(() => {
    if (!isInitialized || !config.loadAutoConnect) return;

    config
      .loadAutoConnect()
      .then((restoredWallet) => {
        if (restoredWallet) {
          console.log(`[${config.id}] Auto-connect successful`);
          setWallet(restoredWallet);
        }
      })
      .catch((error) => {
        console.error(`[${config.id}] Auto-connect failed:`, error);
      });
  }, [config, isInitialized]);

  // ========== Event Listeners ==========
  useEffect(() => {
    if (!wallet || !config.setupListeners) return;

    const cleanup = config.setupListeners(wallet, (newWallet) => {
      console.log(`[${config.id}] Wallet changed via listener:`, newWallet);
      setWallet(newWallet);

      // Clear auto-connect if wallet was removed
      if (newWallet === null && config.clearAutoConnect) {
        config.clearAutoConnect();
      }
    });

    return cleanup;
  }, [wallet, config]);

  // ========== Dependency-Based Auto-Connect ==========
  useEffect(() => {
    if (!config.handleDependencyChange || !options.connectedWallets) return;

    const { connectedWallets } = options;

    // Check if dependencies changed
    const depsChanged = Object.keys(connectedWallets).some(
      (key) => prevDependenciesRef.current[key] !== connectedWallets[key]
    );

    if (!depsChanged) return;

    prevDependenciesRef.current = { ...connectedWallets };

    config
      .handleDependencyChange(connectedWallets, wallet)
      .then(async (result) => {
        if (result.action === 'connect' && result.walletName) {
          // Find matching wallet and connect
          const matchingWallet = installedWallets.find((w) => w.name === result.walletName);
          if (matchingWallet) {
            console.log(
              `[${config.id}] Auto-connecting based on dependency: ${result.walletName}`
            );
            try {
              const connectedWallet = await config.connectWallet(matchingWallet);
              setWallet(connectedWallet);
              if (config.saveAutoConnect) {
                config.saveAutoConnect(connectedWallet);
              }
            } catch (error) {
              console.error(`[${config.id}] Dependency-based auto-connect failed:`, error);
            }
          }
        } else if (result.action === 'disconnect' && wallet) {
          console.log(`[${config.id}] Disconnecting based on dependency change`);
          await config.disconnectWallet(wallet);
          setWallet(null);
          if (config.clearAutoConnect) {
            config.clearAutoConnect();
          }
        }
      })
      .catch((error) => {
        console.error(`[${config.id}] Failed to handle dependency change:`, error);
      });
  }, [options.connectedWallets, installedWallets, wallet, config]);

  // ========== Modal Control ==========
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // ========== Connect Wallet ==========
  const connectWalletFn = useCallback(
    async (walletOption: ChainWalletOption<WalletDescriptor<TDetectionData>>) => {
      try {
        console.log(`[${config.id}] Connecting to wallet:`, walletOption.name);
        const connectedWallet = await config.connectWallet(walletOption.data);
        setWallet(connectedWallet);

        if (config.saveAutoConnect) {
          config.saveAutoConnect(connectedWallet);
        }

        closeModal();
      } catch (error) {
        console.error(`[${config.id}] Failed to connect wallet:`, error);
        throw error;
      }
    },
    [config, closeModal]
  );

  // ========== Disconnect Wallet ==========
  const disconnectFn = useCallback(async () => {
    if (!wallet) return;

    try {
      console.log(`[${config.id}] Disconnecting wallet`);
      await config.disconnectWallet(wallet);
      setWallet(null);

      if (config.clearAutoConnect) {
        config.clearAutoConnect();
      }
    } catch (error) {
      console.error(`[${config.id}] Failed to disconnect wallet:`, error);
      throw error;
    }
  }, [wallet, config]);

  // ========== Connect (main entry point) ==========
  const connect = useCallback(() => {
    if (installedWallets.length === 1) {
      // Only one wallet available - connect directly
      const singleWallet = installedWallets[0];
      connectWalletFn({
        name: singleWallet.name,
        icon: singleWallet.icon,
        data: singleWallet,
      }).catch((err) => {
        console.error(`[${config.id}] Auto-connect to single wallet failed:`, err);
      });
    } else {
      // Multiple wallets - open modal
      openModal();
    }
  }, [installedWallets, connectWalletFn, openModal, config.id]);

  // ========== Convert to ChainWalletOption format ==========
  const installedWalletOptions = useMemo<ChainWalletOption<WalletDescriptor<TDetectionData>>[]>(
    () =>
      installedWallets.map((w) => ({
        name: w.name,
        icon: w.icon,
        data: w,
      })),
    [installedWallets]
  );

  const installableWalletOptions = useMemo<
    ChainWalletOption<WalletDescriptor<TDetectionData>>[]
  >(
    () =>
      installableWallets.map((w) => ({
        name: w.name,
        icon: w.icon,
        data: w,
      })),
    [installableWallets]
  );

  // ========== Build ChainData ==========
  const chainData = useMemo<ChainWalletData<TSigner>>(() => {
    // Check if chain is enabled
    if (config.isEnabled && !config.isEnabled()) {
      return null;
    }

    const signer = wallet ? config.createSigner(wallet) : null;
    const walletInfo = wallet ? config.getWalletInfo(wallet) : null;
    const swapperOptions = wallet && config.getSwapperOptions ? config.getSwapperOptions(wallet) : undefined;

    return {
      chain: {
        name: config.name,
        icon: config.icon,
      },
      wallet: walletInfo
        ? {
            name: walletInfo.name,
            icon: walletInfo.icon,
            address: walletInfo.address,
            instance: signer,
          }
        : null,
      id: config.id,
      connect: installedWallets.length > 0 || installableWallets.length > 0 ? connect : null,
      disconnect: wallet ? disconnectFn : null,
      changeWallet: wallet && installedWallets.length > 1 ? connect : null,
      swapperOptions,
    };
  }, [
    config,
    wallet,
    installedWallets,
    installableWallets,
    connect,
    disconnectFn,
  ]);

  // ========== Return StandardChainHookResult ==========
  return useMemo(
    () => ({
      chainData,
      installedWallets: installedWalletOptions,
      installableWallets: installableWalletOptions,
      connectWallet: connectWalletFn,
      openModal,
      closeModal,
      isModalOpen,
    }),
    [
      chainData,
      installedWalletOptions,
      installableWalletOptions,
      connectWalletFn,
      openModal,
      closeModal,
      isModalOpen,
    ]
  );
}
