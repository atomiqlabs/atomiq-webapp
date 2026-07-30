import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
  BitcoinTokens,
  fromHumanReadableString,
  SwapType,
} from '@atomiqlabs/sdk';
import EventEmitter from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChainsContext } from '../../../context/ChainsContext';
import {
  IntermediateBitcoinWalletContext,
  type IntermediateBitcoinWalletContextValue,
} from '../../../context/IntermediateBitcoinWalletContext';
import { SwapperContext } from '../../../context/SwapperContext';
import { Tokens } from '../../../utils/SwapperFactory';
import { useQuote } from '../useQuote';

vi.mock('randombytes', () => ({
  default: () => new Uint8Array(32),
}));

type Harness = {
  inputWallet?: any;
  intermediateWallet?: any;
  swapType: SwapType;
};

function makeHarness(initial?: Partial<Harness>) {
  const config: Harness = {
    inputWallet: null,
    intermediateWallet: undefined,
    swapType: SwapType.SPV_VAULT_FROM_BTC,
    ...initial,
  };
  const quote = { id: 'quote' };
  const swap = vi.fn().mockResolvedValue(quote);
  const swapper = {
    getSwapType: vi.fn(() => config.swapType),
    swap,
    Utils: {
      randomAddress: vi.fn(() => '0xrandom'),
    },
  } as any;

  function Wrapper({ children }: { children: React.ReactNode }) {
    const intermediateValue: IntermediateBitcoinWalletContextValue = {
      wallet: config.intermediateWallet,
      address: config.intermediateWallet?.getReceiveAddress?.(),
      confirmedBalance: 0n,
      unconfirmedBalance: 0n,
      refreshBalance: vi.fn(),
      backupAcknowledged: true,
      openMnemonicBackupModal: vi.fn(),
      openSendBitcoinModal: vi.fn(),
      loading: false,
    };

    return (
      <SwapperContext.Provider
        value={{
          swapper,
          initializedSwapper: swapper,
          loading: false,
          syncing: false,
          events: new EventEmitter(),
          stickyAddress: true,
        }}
      >
        <IntermediateBitcoinWalletContext.Provider value={intermediateValue}>
          <ChainsContext.Provider
            value={{
              chains: {
                BITCOIN: {
                  chain: { name: 'Bitcoin', icon: '/bitcoin.svg' },
                  wallet: config.inputWallet ?? null,
                  installedWallets: [],
                  nonInstalledWallets: [],
                  chainId: 'BITCOIN',
                  _disconnect: vi.fn(),
                  _connectWallet: vi.fn(),
                  hasWallets: true,
                },
                STARKNET: {
                  chain: { name: 'Starknet', icon: '/starknet.svg' },
                  wallet: {
                    name: 'Starknet wallet',
                    icon: '/starknet.svg',
                    instance: {},
                    address: '0x1234',
                  },
                  installedWallets: [],
                  nonInstalledWallets: [],
                  chainId: 'STARKNET',
                  _disconnect: vi.fn(),
                  _connectWallet: vi.fn(),
                  hasWallets: true,
                },
              },
              connectWallet: vi.fn(),
              disconnectWallet: vi.fn(),
              changeWallet: vi.fn(),
            } as any}
          >
            {children}
          </ChainsContext.Provider>
        </IntermediateBitcoinWalletContext.Provider>
      </SwapperContext.Provider>
    );
  }

  return { config, quote, swap, swapper, Wrapper };
}

describe('useQuote SPV Bitcoin source', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for and passes the intermediate wallet for an exact-input SPV quote', async () => {
    const harness = makeHarness();
    const { rerender } = renderHook(
      () =>
        useQuote(
          '0.01',
          true,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
          undefined,
          4,
        ),
      { wrapper: harness.Wrapper },
    );

    expect(harness.swap).not.toHaveBeenCalled();

    const intermediateWallet = {
      getReceiveAddress: () => 'bc1qintermediate',
    };
    harness.config.intermediateWallet = intermediateWallet;
    rerender();

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));
    const call = harness.swap.mock.calls[0];
    expect(call[2]).toBe(fromHumanReadableString('0.01', BitcoinTokens.BTC));
    expect(call[3]).toBe(true);
    expect(call[4]).toBe(intermediateWallet);
    expect(call[6]).toMatchObject({
      bitcoinFeeRate: 4,
      maxAllowedBitcoinFeeRate: 9,
      stickyAddress: true,
    });
    expect(call[6]).not.toHaveProperty('sourceWalletUtxos');
  });

  it('passes the intermediate wallet and requested output amount for exact-output SPV', async () => {
    const intermediateWallet = {
      getReceiveAddress: () => 'bc1qintermediate',
    };
    const harness = makeHarness({ intermediateWallet });

    renderHook(
      () =>
        useQuote(
          '0.1',
          false,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
          undefined,
          2,
        ),
      { wrapper: harness.Wrapper },
    );

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));
    const call = harness.swap.mock.calls[0];
    expect(call[2]).toBe(fromHumanReadableString('0.1', Tokens.STARKNET.ETH));
    expect(call[3]).toBe(false);
    expect(call[4]).toBe(intermediateWallet);
    expect(call[6]).not.toHaveProperty('sourceWalletUtxos');
  });

  it('recognizes a funded intermediate pseudo-wallet by instance identity', async () => {
    const intermediateWallet = {
      getReceiveAddress: () => 'bc1qintermediate',
    };
    const harness = makeHarness({
      intermediateWallet,
      inputWallet: {
        name: 'Any display name',
        icon: '/bitcoin.svg',
        instance: intermediateWallet,
        address: 'bc1qintermediate',
      },
    });

    renderHook(
      () =>
        useQuote(
          '0.01',
          true,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
        ),
      { wrapper: harness.Wrapper },
    );

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));
    expect(harness.swap.mock.calls[0][4]).toBe(intermediateWallet);
  });

  it('passes an explicit extension address and preserves the PSBT quote path', async () => {
    const intermediateWallet = {
      getReceiveAddress: () => 'bc1qintermediate',
    };
    const extensionInstance = {};
    const harness = makeHarness({
      intermediateWallet,
      inputWallet: {
        name: 'Browser wallet',
        icon: '/wallet.svg',
        instance: extensionInstance,
        address: 'bc1qextension',
      },
    });

    renderHook(
      () =>
        useQuote(
          '0.01',
          true,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
          undefined,
          3,
        ),
      { wrapper: harness.Wrapper },
    );

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));
    expect(harness.swap.mock.calls[0][4]).toBe('bc1qextension');
  });

  it('preserves the existing non-SPV source-address behavior', async () => {
    const intermediateWallet = {
      getReceiveAddress: () => 'bc1qintermediate',
    };
    const harness = makeHarness({
      intermediateWallet,
      swapType: SwapType.FROM_BTC,
      inputWallet: {
        name: 'Browser wallet',
        icon: '/wallet.svg',
        instance: {},
        address: 'bc1qextension',
      },
    });

    renderHook(
      () =>
        useQuote(
          '0.01',
          true,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
          undefined,
          3,
        ),
      { wrapper: harness.Wrapper },
    );

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));
    const call = harness.swap.mock.calls[0];
    expect(call[4]).toBe('bc1qextension');
    expect(call[6]).toMatchObject({
      maxAllowedNetworkFeeRate: 7.5,
      stickyAddress: true,
    });
    expect(call[6]).not.toHaveProperty('bitcoinFeeRate');
  });

  it('refreshes the quote when the fee rate or intermediate wallet changes', async () => {
    const firstWallet = {
      getReceiveAddress: () => 'bc1qfirst',
    };
    const harness = makeHarness({ intermediateWallet: firstWallet });

    const { rerender } = renderHook(
      ({ feeRate }: { feeRate: number }) =>
        useQuote(
          '0.01',
          true,
          BitcoinTokens.BTC,
          Tokens.STARKNET.ETH,
          '0xreceiver',
          undefined,
          feeRate,
        ),
      {
        initialProps: { feeRate: 5 },
        wrapper: harness.Wrapper,
      },
    );

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(1));

    const secondWallet = {
      getReceiveAddress: () => 'bc1qsecond',
    };
    harness.config.intermediateWallet = secondWallet;
    rerender({ feeRate: 5 });

    await waitFor(() => expect(harness.swap).toHaveBeenCalledTimes(2));
    expect(harness.swap.mock.calls[1][4]).toBe(secondWallet);
  });
});
