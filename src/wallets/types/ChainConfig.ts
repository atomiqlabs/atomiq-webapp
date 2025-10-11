/**
 * Chain Configuration Interface
 *
 * This interface defines the structure for chain-specific configuration
 * using dependency injection pattern. Each chain provides its own
 * implementation of these functions.
 */

import { ChainIdentifiers } from '../context/ChainDataContext';
import { ChainWalletOption } from './ChainHookTypes';

/**
 * Descriptor for a wallet (before connection)
 * This is what detectWallets() returns
 */
export interface WalletDescriptor<T = any> {
  name: string;
  icon: string;
  data: T; // Chain-specific wallet type (BitcoinWalletType, etc.)
}

/**
 * Result of wallet detection
 */
export interface WalletDetectionResult<T = any> {
  installed: WalletDescriptor<T>[];
  installable: WalletDescriptor<T>[];
}

/**
 * Wallet info after connection
 */
export interface ConnectedWalletInfo {
  name: string;
  icon: string;
  address?: string;
}

/**
 * Chain configuration with dependency injection
 *
 * TWalletInstance = The wallet instance type (ExtensionBitcoinWallet, WebLNProvider, etc.)
 * TSigner = The signer type (BitcoinSigner, SolanaSigner, etc.)
 * TDetectionData = The type used in WalletDescriptor.data
 */
export interface ChainConfig<TWalletInstance, TSigner, TDetectionData = any> {
  // ========== Metadata ==========

  /** Chain identifier (BITCOIN, SOLANA, etc.) */
  id: ChainIdentifiers;

  /** Human-readable chain name */
  name: string;

  /** Path to chain icon */
  icon: string;

  // ========== Wallet Detection ==========

  /**
   * Detect installed and installable wallets
   * Called once on mount
   */
  detectWallets: () => Promise<WalletDetectionResult<TDetectionData>>;

  // ========== Connection Lifecycle ==========

  /**
   * Connect to a wallet
   * @param walletDescriptor - The wallet to connect to (from detectWallets result)
   * @returns The connected wallet instance
   */
  connectWallet: (walletDescriptor: WalletDescriptor<TDetectionData>) => Promise<TWalletInstance>;

  /**
   * Disconnect from wallet
   * @param wallet - The wallet instance to disconnect
   */
  disconnectWallet: (wallet: TWalletInstance) => Promise<void> | void;

  // ========== Wallet Info ==========

  /**
   * Create signer from wallet instance
   * @param wallet - The connected wallet
   * @returns Signer instance or null
   */
  createSigner: (wallet: TWalletInstance) => TSigner | null;

  /**
   * Get wallet display info
   * @param wallet - The connected wallet
   * @returns Display information (name, icon, address)
   */
  getWalletInfo: (wallet: TWalletInstance) => ConnectedWalletInfo;

  // ========== Optional: Auto-Connect ==========

  /**
   * Load auto-connect state (e.g., from localStorage)
   * Called on mount
   * @returns The wallet instance if auto-connect succeeds, null otherwise
   */
  loadAutoConnect?: () => Promise<TWalletInstance | null>;

  /**
   * Save auto-connect state
   * Called after successful connection
   * @param wallet - The wallet to save
   */
  saveAutoConnect?: (wallet: TWalletInstance) => void;

  /**
   * Clear auto-connect state
   * Called on disconnect
   */
  clearAutoConnect?: () => void;

  // ========== Optional: Event Listeners ==========

  /**
   * Setup event listeners for wallet changes
   * Called when wallet is connected
   * @param wallet - The connected wallet
   * @param onChange - Callback when wallet changes
   * @returns Cleanup function
   */
  setupListeners?: (
    wallet: TWalletInstance,
    onChange: (newWallet: TWalletInstance | null) => void
  ) => () => void;

  // ========== Optional: Additional Data ==========

  /**
   * Get swapper options for this chain
   * @param wallet - The connected wallet
   * @returns Chain-specific swapper options
   */
  getSwapperOptions?: (wallet: TWalletInstance) => any;

  /**
   * Check if chain is enabled (feature flag)
   * @returns true if chain should be available
   */
  isEnabled?: () => boolean;

  // ========== Optional: Dependencies ==========

  /**
   * Other chains this chain depends on (for auto-connect)
   * E.g., Bitcoin can auto-connect when Solana connects (if same wallet)
   */
  dependencies?: ChainIdentifiers[];

  /**
   * Handle dependency changes (for auto-connect logic)
   * @param connectedWallets - Map of chainId -> walletName
   * @param wallet - Current wallet instance (if any)
   * @returns Action to take: 'connect' | 'disconnect' | 'none'
   */
  handleDependencyChange?: (
    connectedWallets: Record<string, string>,
    wallet: TWalletInstance | null
  ) => Promise<{ action: 'connect' | 'disconnect' | 'none'; walletName?: string }>;
}

/**
 * Helper type to extract wallet instance type from config
 */
export type ExtractWalletInstance<T> = T extends ChainConfig<infer W, any, any> ? W : never;

/**
 * Helper type to extract signer type from config
 */
export type ExtractSigner<T> = T extends ChainConfig<any, infer S, any> ? S : never;
