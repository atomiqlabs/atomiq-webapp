/**
 * Lightning Network Chain Configuration
 *
 * Lightning uses WebLN standard with built-in modal,
 * so we don't provide wallet detection - just connection logic.
 */

import { requestProvider, WebLNProvider } from 'webln';
import { ChainConfig } from '../types/ChainConfig';

/**
 * Lightning chain configuration
 * Uses WebLN's built-in modal for wallet selection
 */
export const lightningConfig: ChainConfig<WebLNProvider, WebLNProvider, never> = {
  // ========== Metadata ==========
  id: 'LIGHTNING',
  name: 'Lightning',
  icon: '/icons/chains/LIGHTNING.svg',

  // ========== Wallet Detection ==========
  detectWallets: async () => {
    // Lightning uses WebLN's built-in modal
    // We don't detect individual wallets
    return {
      installed: [],
      installable: [],
    };
  },

  // ========== Connection Lifecycle ==========
  connectWallet: async () => {
    // WebLN handles wallet selection internally
    const provider = await requestProvider();
    return provider;
  },

  disconnectWallet: () => {
    // WebLN doesn't have explicit disconnect
    // State is managed by the hook
  },

  // ========== Wallet Info ==========
  createSigner: (wallet) => {
    // For Lightning, the provider IS the signer
    return wallet;
  },

  getWalletInfo: () => {
    // WebLN doesn't expose wallet name/icon
    return {
      name: 'WebLN',
      icon: '/wallets/WebLN.png',
    };
  },

  // ========== Optional: Enabled Check ==========
  isEnabled: () => {
    // Check if WebLN is available
    return (window as any)?.webln != null;
  },
};
