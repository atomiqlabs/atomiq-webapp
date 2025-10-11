/**
 * Starknet Chain Configuration
 *
 * Starknet uses get-starknet library with built-in modal.
 * Supports auto-connect from localStorage and account change listeners.
 */
import { wallet, WalletAccount } from 'starknet';
import { connect, disconnect } from '@starknet-io/get-starknet';
import { StarknetFees, StarknetSigner } from '@atomiqlabs/chain-starknet';
import { FEConstants } from '../../FEConstants';
import { timeoutPromise } from '../../utils/Utils';
/**
 * Helper to wait until wallet address is populated
 */
function waitTillAddressPopulated(acc) {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (acc.address !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
                acc.address !== '') {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
}
/**
 * Starknet chain configuration
 */
export const starknetConfig = {
    // ========== Metadata ==========
    id: 'STARKNET',
    name: 'Starknet',
    icon: '/icons/chains/STARKNET.svg',
    // ========== Wallet Detection ==========
    detectWallets: async () => {
        // Starknet uses get-starknet's built-in modal
        // We don't detect individual wallets
        return {
            installed: [],
            installable: [],
        };
    },
    // ========== Connection Lifecycle ==========
    connectWallet: async () => {
        // get-starknet handles wallet selection
        const swo = await connect({ modalMode: 'alwaysAsk', modalTheme: 'dark' });
        if (!swo) {
            throw new Error('No Starknet wallet selected');
        }
        // Connect to wallet account
        const walletAccount = await WalletAccount.connect(FEConstants.starknetRpc, swo);
        const chainId = await wallet.requestChainId(walletAccount.walletProvider);
        console.log('[Starknet] Connected wallet chainId:', chainId);
        // Validate chain ID
        if (chainId != null && FEConstants.starknetChainId !== chainId) {
            console.error('[Starknet] Invalid chainId:', chainId);
            throw new Error(`Invalid chain ID. Expected ${FEConstants.starknetChainId}, got ${chainId}`);
        }
        // Wait for address to populate
        await waitTillAddressPopulated(walletAccount);
        const starknetSigner = new StarknetSigner(walletAccount);
        return {
            swo,
            account: walletAccount,
            signer: starknetSigner,
        };
    },
    disconnectWallet: async (walletData) => {
        await disconnect({ clearLastWallet: true }).catch((e) => console.error('[Starknet] Error during disconnect:', e));
        // Clear localStorage
        Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith('gsw-last-')) {
                window.localStorage.removeItem(key);
            }
        });
    },
    // ========== Wallet Info ==========
    createSigner: (walletData) => {
        return walletData.signer;
    },
    getWalletInfo: (walletData) => {
        const { swo, signer } = walletData;
        return {
            name: swo.name,
            icon: typeof swo.icon !== 'string' ? swo.icon?.dark : swo.icon,
            address: signer.getAddress(),
        };
    },
    // ========== Auto-Connect ==========
    loadAutoConnect: async () => {
        const savedWalletId = window.localStorage.getItem('starknet-wallet');
        if (!savedWalletId)
            return null;
        try {
            await timeoutPromise(3000);
            const swo = await connect({
                modalMode: 'neverAsk',
                modalTheme: 'dark',
                include: [savedWalletId],
            });
            if (!swo)
                return null;
            console.log('[Starknet] Auto-connect successful:', swo.name);
            const walletAccount = await WalletAccount.connect(FEConstants.starknetRpc, swo);
            const chainId = await wallet.requestChainId(walletAccount.walletProvider);
            if (chainId != null && FEConstants.starknetChainId !== chainId) {
                console.error('[Starknet] Auto-connect failed: invalid chainId');
                return null;
            }
            await waitTillAddressPopulated(walletAccount);
            const starknetSigner = new StarknetSigner(walletAccount);
            return {
                swo,
                account: walletAccount,
                signer: starknetSigner,
            };
        }
        catch (error) {
            console.error('[Starknet] Auto-connect failed:', error);
            return null;
        }
    },
    saveAutoConnect: (walletData) => {
        window.localStorage.setItem('starknet-wallet', walletData.swo.id);
    },
    clearAutoConnect: () => {
        window.localStorage.removeItem('starknet-wallet');
    },
    // ========== Event Listeners ==========
    setupListeners: (walletData, onChange) => {
        const { swo, account } = walletData;
        const listener = (accounts) => {
            console.log('[Starknet] accountsChanged event:', accounts);
            // Create new signer with updated account
            const newSigner = new StarknetSigner(account);
            // Validate chain ID
            wallet.requestChainId(account.walletProvider).then((chainId) => {
                console.log('[Starknet] Chain ID after account change:', chainId);
                if (FEConstants.starknetChainId !== chainId) {
                    // Invalid chain - disconnect
                    onChange(null);
                }
                else {
                    // Valid chain - update wallet data
                    onChange({
                        swo,
                        account,
                        signer: newSigner,
                    });
                }
            });
        };
        swo.on('accountsChanged', listener);
        return () => {
            swo.off('accountsChanged', listener);
        };
    },
    // ========== Additional Options ==========
    getSwapperOptions: () => {
        return {
            rpcUrl: FEConstants.starknetRpc,
            chainId: FEConstants.starknetChainId,
            fees: new StarknetFees(FEConstants.starknetRpc),
        };
    },
    // ========== Enabled Check ==========
    isEnabled: () => {
        return FEConstants.allowedChains.has('STARKNET');
    },
};
