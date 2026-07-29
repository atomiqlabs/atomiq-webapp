import * as React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import EventEmitter from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitcoinTokens } from '@atomiqlabs/sdk';
import { ChainsContext } from '../../../context/ChainsContext';
import {
  IntermediateBitcoinWalletContext,
  IntermediateBitcoinWalletContextValue,
} from '../../../context/IntermediateBitcoinWalletContext';
import { SwapperContext } from '../../../context/SwapperContext';
import { useWallet } from '../../../hooks/wallets/useWallet';
import { ExtensionBitcoinWallet } from '../../../wallets/bitcoin/base/ExtensionBitcoinWallet';
import { getInstalledBitcoinWallets } from '../../../wallets/bitcoin/utils/BitcoinWalletUtils';
import { useBitcoinChain } from '../useBitcoinChain';

const INTERMEDIATE_BTC_MNEMONIC_KEY =
  'atomiq-intermediate-btc-mnemonic-v1';

vi.mock('../../../wallets/bitcoin/utils/BitcoinWalletUtils', async (importOriginal) => {
  const original = await importOriginal<
    typeof import('../../../wallets/bitcoin/utils/BitcoinWalletUtils')
  >();
  return {
    ...original,
    getInstalledBitcoinWallets: vi.fn(),
  };
});

function makeSdkWallet(address = 'bc1qintermediate') {
  return {
    getReceiveAddress: vi.fn().mockReturnValue(address),
    getBalance: vi.fn(),
    getSpendableBalance: vi.fn(),
    getUtxoPool: vi.fn(),
  } as any;
}

function makeExtensionWallet() {
  return {
    getName: vi.fn().mockReturnValue('Unisat'),
    getIcon: vi.fn().mockReturnValue('/unisat-connected.svg'),
    getReceiveAddress: vi.fn().mockReturnValue('bc1qextension'),
    onWalletChanged: vi.fn(),
    offWalletChanged: vi.fn(),
    wasAutomaticallyInitiated: false,
  } as any;
}

function makeIntermediateValue(
  wallet: any,
  confirmedBalance: bigint,
  unconfirmedBalance: bigint,
  refreshBalance = vi.fn().mockResolvedValue({
    confirmedBalance,
    unconfirmedBalance,
  }),
): IntermediateBitcoinWalletContextValue {
  return {
    wallet,
    address: wallet.getReceiveAddress(),
    confirmedBalance,
    unconfirmedBalance,
    refreshBalance,
    backupAcknowledged: true,
    openMnemonicBackupModal: vi.fn(),
    openSendBitcoinModal: vi.fn(),
    loading: false,
  };
}

const installedWallet = {
  name: 'Unisat',
  iconUrl: '/unisat.svg',
  installUrl: 'https://unisat.io',
  use: vi.fn(),
};
const installableWallet = {
  name: 'Xverse',
  iconUrl: '/xverse.svg',
  installUrl: 'https://xverse.app',
  use: vi.fn(),
};

function mockInstalledWallets(active?: () => Promise<any>) {
  vi.mocked(getInstalledBitcoinWallets).mockResolvedValue({
    installed: [installedWallet],
    installable: [installableWallet],
    active,
  } as any);
}

function makeWrapper(
  getIntermediate: () => IntermediateBitcoinWalletContextValue,
  swapper: any,
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SwapperContext.Provider
        value={{
          swapper,
          initializedSwapper: swapper,
          loading: false,
          syncing: false,
          events: new EventEmitter(),
        }}
      >
        <IntermediateBitcoinWalletContext.Provider value={getIntermediate()}>
          {children}
        </IntermediateBitcoinWalletContext.Provider>
      </SwapperContext.Provider>
    );
  };
}

function makeSwapper() {
  return {
    prices: {
      getUsdValue: vi.fn(),
    },
    Utils: {
      getBitcoinSpendableBalance: vi.fn(),
    },
  } as any;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  mockInstalledWallets();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBitcoinChain intermediate wallet selection', () => {
  it('keeps an empty intermediate wallet out of the active and connector slots', async () => {
    const sdkWallet = makeSdkWallet();
    const intermediate = makeIntermediateValue(sdkWallet, 0n, 0n);

    const { result } = renderHook(() => useBitcoinChain(true, {}), {
      wrapper: makeWrapper(() => intermediate, makeSwapper()),
    });

    await waitFor(() => expect(result.current.installedWallets).toHaveLength(1));
    expect(result.current.wallet).toBeNull();
    expect(result.current.installedWallets).toEqual([
      {
        name: 'Unisat',
        icon: '/unisat.svg',
        isConnected: false,
      },
    ]);
    expect(result.current.nonInstalledWallets).toEqual([
      {
        name: 'Xverse',
        icon: '/xverse.svg',
        downloadLink: 'https://xverse.app',
      },
    ]);
  });

  it('exposes a funded input-only wallet with an authoritative raw display balance', async () => {
    const sdkWallet = makeSdkWallet();
    const refreshBalance = vi.fn().mockResolvedValue({
      confirmedBalance: 70_000n,
      unconfirmedBalance: 5_000n,
    });
    const intermediate = makeIntermediateValue(
      sdkWallet,
      60_000n,
      2_500n,
      refreshBalance,
    );
    const swapper = makeSwapper();

    const { result } = renderHook(() => useBitcoinChain(true, {}), {
      wrapper: makeWrapper(() => intermediate, swapper),
    });

    await waitFor(() =>
      expect(result.current.wallet?.name).toBe('Intermediate wallet'),
    );
    expect(result.current.wallet).toMatchObject({
      name: 'Intermediate wallet',
      icon: '/icons/chains/BITCOIN.svg',
      address: 'bc1qintermediate',
      instance: sdkWallet,
      onlyInput: true,
    });

    const balance = await result.current.wallet.getBalance({
      currency: BitcoinTokens.BTC,
      swapType: null,
      input: true,
    });
    expect(refreshBalance).toHaveBeenCalledTimes(1);
    expect(balance.balance).toBeUndefined();
    expect(balance.displayBalance).toBe(75_000n);
    expect(balance.feeRate).toBeUndefined();
    expect(sdkWallet.getSpendableBalance).not.toHaveBeenCalled();
    expect(sdkWallet.getUtxoPool).not.toHaveBeenCalled();
    expect(swapper.Utils.getBitcoinSpendableBalance).not.toHaveBeenCalled();

    expect(result.current.wallet.additionalWalletActions).toEqual([
      {
        icon: 'icon-file-text',
        text: 'Back up wallet',
        onClick: intermediate.openMnemonicBackupModal,
      },
      {
        icon: 'icon-send-claim',
        text: 'Send Bitcoin',
        onClick: intermediate.openSendBitcoinModal,
      },
    ]);

    act(() => result.current.wallet.additionalWalletActions[0].onClick());
    act(() => result.current.wallet.additionalWalletActions[1].onClick());
    expect(intermediate.openMnemonicBackupModal).toHaveBeenCalledTimes(1);
    expect(intermediate.openSendBitcoinModal).toHaveBeenCalledTimes(1);
  });

  it('disconnects an automatically selected wallet when its raw total returns to zero', async () => {
    const sdkWallet = makeSdkWallet();
    let intermediate = makeIntermediateValue(sdkWallet, 0n, 0n);
    const { result, rerender } = renderHook(() => useBitcoinChain(true, {}), {
      wrapper: makeWrapper(() => intermediate, makeSwapper()),
    });
    await waitFor(() => expect(result.current.installedWallets).toHaveLength(1));
    expect(result.current.wallet).toBeNull();

    intermediate = makeIntermediateValue(sdkWallet, 0n, 25n);
    rerender();
    await waitFor(() =>
      expect(result.current.wallet?.instance).toBe(sdkWallet),
    );

    intermediate = makeIntermediateValue(sdkWallet, 0n, 0n);
    rerender();
    expect(result.current.wallet).toBeNull();
  });

  it('automatically selects a funded intermediate wallet after restoring an extension wallet', async () => {
    const extensionWallet = makeExtensionWallet();
    const restoreActiveWallet = vi
      .fn()
      .mockResolvedValue(extensionWallet);
    mockInstalledWallets(restoreActiveWallet);
    const sdkWallet = makeSdkWallet();
    const intermediate = makeIntermediateValue(sdkWallet, 10_000n, 0n);

    const { result } = renderHook(() => useBitcoinChain(true, {}), {
      wrapper: makeWrapper(() => intermediate, makeSwapper()),
    });

    await waitFor(() => expect(restoreActiveWallet).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.installedWallets).toHaveLength(1));
    await waitFor(() => expect(result.current.wallet?.instance).toBe(sdkWallet));
    expect(result.current.wallet).toMatchObject({
      name: 'Intermediate wallet',
      address: 'bc1qintermediate',
      instance: sdkWallet,
      onlyInput: true,
    });
  });

  it('disconnects through the shared path, preserves storage, and reconnects after a balance change', async () => {
    const clearState = vi
      .spyOn(ExtensionBitcoinWallet, 'clearState')
      .mockImplementation(() => undefined);
    const sdkWallet = makeSdkWallet();
    let intermediate = makeIntermediateValue(sdkWallet, 100n, 0n);
    const swapper = makeSwapper();
    window.localStorage.setItem(
      INTERMEDIATE_BTC_MNEMONIC_KEY,
      JSON.stringify({
        mnemonic: 'private mnemonic',
        acknowledged: true,
      }),
    );

    const { result, rerender } = renderHook(() => useBitcoinChain(true, {}), {
      wrapper: makeWrapper(() => intermediate, swapper),
    });
    await waitFor(() =>
      expect(result.current.wallet?.instance).toBe(sdkWallet),
    );
    await waitFor(() => expect(result.current.installedWallets).toHaveLength(1));

    const chain = result.current;
    const walletHook = renderHook(
      () => ({
        input: useWallet('BITCOIN', true),
        output: useWallet('BITCOIN', false),
      }),
      {
        wrapper: ({ children }) => (
          <ChainsContext.Provider
            value={{
              chains: { BITCOIN: chain },
              connectWallet: vi.fn(),
              disconnectWallet: vi.fn(),
              changeWallet: vi.fn(),
            }}
          >
            {children}
          </ChainsContext.Provider>
        ),
      },
    );
    expect(walletHook.result.current.input?.instance).toBe(sdkWallet);
    expect(walletHook.result.current.output).toBeNull();

    act(() => result.current._disconnect());
    await waitFor(() => expect(result.current.wallet).toBeNull());
    expect(clearState).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(window.localStorage.getItem(INTERMEDIATE_BTC_MNEMONIC_KEY)),
    ).toEqual({
      mnemonic: 'private mnemonic',
      acknowledged: true,
    });

    intermediate = makeIntermediateValue(sdkWallet, 101n, 0n);
    rerender();
    await waitFor(() =>
      expect(result.current.wallet?.instance).toBe(sdkWallet),
    );
  });
});
