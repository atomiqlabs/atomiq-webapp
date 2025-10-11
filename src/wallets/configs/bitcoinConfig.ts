/**
 * Bitcoin Chain Configuration
 *
 * Bitcoin supports multiple wallet extensions with auto-connect based on
 * other connected chains (e.g., if Phantom is connected on Solana,
 * auto-connect Phantom on Bitcoin).
 */

import { ChainConfig } from '../types/ChainConfig';
import { ExtensionBitcoinWallet } from '../chains/bitcoin/base/ExtensionBitcoinWallet';
import { BitcoinWalletType, getInstalledBitcoinWallets } from '../chains/bitcoin/utils/BitcoinWalletUtils';

/**
 * Bitcoin chain configuration
 */
export const bitcoinConfig: ChainConfig<
  ExtensionBitcoinWallet,
  ExtensionBitcoinWallet,
  BitcoinWalletType
> = {
  // ========== Metadata ==========
  id: 'BITCOIN',
  name: 'Bitcoin',
  icon: '/icons/chains/BITCOIN.svg',

  // ========== Wallet Detection ==========
  detectWallets: async () => {
    const result = await getInstalledBitcoinWallets();

    return {
      installed: result.installed.map((w) => ({
        name: w.name,
        icon: w.iconUrl,
        data: w,
      })),
      installable: result.installable.map((w) => ({
        name: w.name,
        icon: w.iconUrl,
        data: w,
      })),
    };
  },

  // ========== Connection Lifecycle ==========
  connectWallet: async (descriptor) => {
    const wallet = await descriptor.data.use();
    return wallet;
  },

  disconnectWallet: () => {
    ExtensionBitcoinWallet.clearState();
  },

  // ========== Wallet Info ==========
  createSigner: (wallet) => {
    // For Bitcoin, the wallet IS the signer
    return wallet;
  },

  getWalletInfo: (wallet) => {
    return {
      name: wallet.getName(),
      icon: wallet.getIcon(),
      address: wallet.getReceiveAddress(),
    };
  },

  // ========== Auto-Connect ==========
  loadAutoConnect: async () => {
    // Try to restore from saved state
    const savedState = ExtensionBitcoinWallet.loadState();
    if (!savedState) return null;

    // Find the wallet type and restore
    const result = await getInstalledBitcoinWallets();
    const walletType = result.installed.find((w) => w.name === savedState.name);

    if (walletType && result.active) {
      try {
        const wallet = await result.active();
        return wallet;
      } catch (error) {
        console.error('[Bitcoin] Failed to restore wallet:', error);
        ExtensionBitcoinWallet.clearState();
        return null;
      }
    }

    return null;
  },

  saveAutoConnect: (wallet) => {
    // State is automatically saved by ExtensionBitcoinWallet
    // No explicit save needed
  },

  clearAutoConnect: () => {
    ExtensionBitcoinWallet.clearState();
  },

  // ========== Event Listeners ==========
  setupListeners: (wallet, onChange) => {
    const listener = (newWallet: ExtensionBitcoinWallet | null) => {
      if (newWallet === null) {
        onChange(null);
      } else if (wallet.getReceiveAddress() !== newWallet.getReceiveAddress()) {
        onChange(newWallet);
      }
    };

    wallet.onWalletChanged(listener);

    return () => {
      wallet.offWalletChanged(listener);
    };
  },

  // ========== Dependencies ==========
  dependencies: ['SOLANA', 'STARKNET'],

  handleDependencyChange: async (connectedWallets, currentWallet) => {
    // Check if a wallet from another chain is the same as Bitcoin wallet
    // (e.g., Phantom works on both Solana and Bitcoin)

    for (const [chainId, walletName] of Object.entries(connectedWallets)) {
      if (chainId === 'BITCOIN') continue;

      if (walletName) {
        // Another chain connected - check if we can auto-connect
        if (!currentWallet) {
          return {
            action: 'connect',
            walletName: walletName,
          };
        }
      }
    }

    // Check if all dependencies disconnected
    const allDisconnected = ['SOLANA', 'STARKNET'].every(
      (dep) => !connectedWallets[dep]
    );

    if (allDisconnected && currentWallet?.wasAutomaticallyInitiated) {
      return {
        action: 'disconnect',
      };
    }

    return { action: 'none' };
  },
};
