import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  BitcoinTokens,
  SwapType,
  toTokenAmount,
  type TokenAmount,
} from '@atomiqlabs/sdk';
import EventEmitter from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChainsContext } from '../../../context/ChainsContext';
import { SwapperContext } from '../../../context/SwapperContext';
import { useWalletBalance } from '../useWalletBalance';

const prices = {
  getUsdValue: vi.fn().mockResolvedValue(0),
};

function makeAmount(rawAmount: bigint): TokenAmount {
  return toTokenAmount(rawAmount, BitcoinTokens.BTC, prices as any);
}

function makeSwapper(getBitcoinSpendableBalance = vi.fn()) {
  return {
    Utils: {
      getBitcoinSpendableBalance,
      getSpendableBalance: vi.fn(),
    },
  } as any;
}

function makeWrapper(wallet: any, swapper: any) {
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
        <ChainsContext.Provider
          value={{
            chains: {
              BITCOIN: {
                chain: { name: 'Bitcoin', icon: '/bitcoin.svg' },
                wallet,
                installedWallets: [],
                nonInstalledWallets: [],
                chainId: 'BITCOIN',
                _disconnect: vi.fn(),
                _connectWallet: vi.fn(),
                hasWallets: true,
              },
            },
            connectWallet: vi.fn(),
            disconnectWallet: vi.fn(),
            changeWallet: vi.fn(),
          }}
        >
          {children}
        </ChainsContext.Provider>
      </SwapperContext.Provider>
    );
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWalletBalance', () => {
  it('uses a wallet balance override as the complete authoritative result', async () => {
    const displayBalance = 125_000n;
    const overrideResult = {
      balance: undefined,
      displayBalance,
      feeRate: undefined,
    };
    const getBalance = vi.fn().mockResolvedValue(overrideResult);
    const getBitcoinSpendableBalance = vi.fn().mockResolvedValue({
      balance: makeAmount(100_000n),
      feeRate: 3,
    });
    const swapper = makeSwapper(getBitcoinSpendableBalance);
    const wallet = {
      name: 'Intermediate wallet',
      icon: '/bitcoin.svg',
      instance: {},
      onlyInput: true,
      getBalance,
    };

    const { result } = renderHook(
      () =>
        useWalletBalance(
          BitcoinTokens.BTC,
          SwapType.SPV_VAULT_FROM_BTC,
          'STARKNET',
          true,
          false,
          12,
          true,
        ),
      { wrapper: makeWrapper(wallet, swapper) },
    );

    await waitFor(() => expect(result.current.displayBalance.rawAmount).toEqual(displayBalance));
    expect(getBalance).toHaveBeenCalledWith({
      currency: BitcoinTokens.BTC,
      swapType: SwapType.SPV_VAULT_FROM_BTC,
      swapChainId: 'STARKNET',
      requestGasDrop: true,
      minBtcFeeRate: 12,
      input: true,
    });
    expect(getBitcoinSpendableBalance).not.toHaveBeenCalled();
  });

  it('keeps the existing Bitcoin spendable-balance path without an override', async () => {
    const fallbackResult = {
      balance: makeAmount(100_000n),
      feeRate: 4,
    };
    const getBitcoinSpendableBalance = vi.fn().mockResolvedValue(fallbackResult);
    const swapper = makeSwapper(getBitcoinSpendableBalance);
    const instance = {};
    const wallet = {
      name: 'Browser wallet',
      icon: '/wallet.svg',
      instance,
    };

    const { result } = renderHook(
      () =>
        useWalletBalance(
          BitcoinTokens.BTC,
          SwapType.SPV_VAULT_FROM_BTC,
          'STARKNET',
          true,
          false,
          8,
          true,
        ),
      { wrapper: makeWrapper(wallet, swapper) },
    );

    await waitFor(() => expect(result.current).toEqual(fallbackResult));
    expect(getBitcoinSpendableBalance).toHaveBeenCalledWith(instance, 'STARKNET', {
      gasDrop: true,
      minFeeRate: 8,
    });
  });

  it('does not publish a completed result while paused', async () => {
    const getBalance = vi.fn().mockResolvedValue({
      balance: undefined,
      displayBalance: makeAmount(50_000n),
    });
    const swapper = makeSwapper(vi.fn().mockResolvedValue(null));
    const wallet = {
      name: 'Intermediate wallet',
      icon: '/bitcoin.svg',
      instance: {},
      getBalance,
    };

    const { result } = renderHook(
      () =>
        useWalletBalance(
          BitcoinTokens.BTC,
          SwapType.SPV_VAULT_FROM_BTC,
          undefined,
          false,
          true,
          undefined,
          true,
        ),
      { wrapper: makeWrapper(wallet, swapper) },
    );

    await waitFor(() => expect(getBalance).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it('ignores an override result that resolves after unmount', async () => {
    let resolveBalance: (value: any) => void;
    const pendingBalance = new Promise((resolve) => {
      resolveBalance = resolve;
    });
    const getBalance = vi.fn().mockReturnValue(pendingBalance);
    const swapper = makeSwapper(vi.fn().mockResolvedValue(null));
    const wallet = {
      name: 'Intermediate wallet',
      icon: '/bitcoin.svg',
      instance: {},
      getBalance,
    };

    const { result, unmount } = renderHook(
      () =>
        useWalletBalance(
          BitcoinTokens.BTC,
          SwapType.SPV_VAULT_FROM_BTC,
          undefined,
          false,
          false,
          undefined,
          true,
        ),
      { wrapper: makeWrapper(wallet, swapper) },
    );

    await waitFor(() => expect(getBalance).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      resolveBalance({
        balance: undefined,
        displayBalance: makeAmount(75_000n),
      });
      await pendingBalance;
    });
    expect(result.current).toBeNull();
  });
});
