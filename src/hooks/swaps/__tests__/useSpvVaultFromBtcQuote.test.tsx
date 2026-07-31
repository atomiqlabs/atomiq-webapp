import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  BitcoinTokens,
  InvalidBitcoinDepositError,
  SpvFromBTCSwapState,
  toTokenAmount,
} from '@atomiqlabs/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChainsContext } from '../../../context/ChainsContext';
import { useSpvVaultFromBtcQuote } from '../useSpvVaultFromBtcQuote';

const hookState = vi.hoisted(() => ({
  wallet: null as any,
  intermediate: null as any,
  swapStateCallback: null as any,
  swapState: null as any,
}));

vi.mock('../helpers/useSwapState', () => ({
  useSwapState: (_quote: any, callback: any) => {
    hookState.swapStateCallback = callback;
    return hookState.swapState;
  },
}));

vi.mock('../../wallets/useWallet', () => ({
  useWallet: () => hookState.wallet,
}));

vi.mock('../../wallets/useIntermediateBitcoinWallet', () => ({
  useIntermediateBitcoinWallet: () => hookState.intermediate,
}));

vi.mock('../../wallets/useSmartChainWallet', () => ({
  useSmartChainWallet: () => ({ instance: {} }),
}));

const prices = {
  getUsdValue: vi.fn().mockResolvedValue(0),
};

function makeAmount(rawAmount: bigint) {
  return toTokenAmount(rawAmount, BitcoinTokens.BTC, prices as any);
}

function pendingWait() {
  return vi.fn(
    (
      _wallet: any,
      _timeout: any,
      _interval: any,
      _onInvalid: any,
      signal: AbortSignal,
    ) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
  );
}

function deferred<T = void>() {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve,
    reject,
  };
}

function emitSwapState(
  state: SpvFromBTCSwapState,
  initiated = hookState.swapState.isInitiated,
) {
  hookState.swapState = {
    ...hookState.swapState,
    state,
    isInitiated: initiated,
  };
  hookState.swapStateCallback?.(state, initiated);
}

function makeQuote(options?: {
  mode?: 'psbt' | 'intermediate_wallet';
  requiresDeposit?: boolean;
  waitForExternalDeposit?: ReturnType<typeof vi.fn>;
  inputAmount?: bigint;
  externalDepositAmount?: bigint;
}) {
  let mode = options?.mode ?? 'psbt';
  const requiresDeposit = options?.requiresDeposit ?? false;
  const externalDepositWait =
    options?.waitForExternalDeposit ?? pendingWait();
  const quote: any = {
    minimumBtcFeeRate: 5,
    getSwapMode: vi.fn(() => mode),
    getState: vi.fn(() => hookState.swapState.state),
    isInitiated: vi.fn(() => hookState.swapState.isInitiated),
    getInput: vi.fn(() => ({
      isUnknown: false,
      rawAmount: options?.inputAmount ?? 100_000n,
    })),
    getExternalDepositAmount: vi.fn(() =>
      makeAmount(options?.externalDepositAmount ?? 25_000n),
    ),
    requiresExternalDeposit: vi.fn(() => requiresDeposit),
    getAddress: vi.fn(() => 'bc1qdeposit'),
    getHyperlink: vi.fn(() => 'bitcoin:bc1qdeposit?amount=0.00025'),
    sendBitcoinTransaction: vi.fn().mockResolvedValue('txid'),
    waitForExternalDeposit: vi.fn((...args: any[]) => {
      emitSwapState(SpvFromBTCSwapState.CREATED, true);
      return externalDepositWait(...args);
    }),
    waitForBitcoinTransaction: vi.fn(),
    waitTillClaimedOrFronted: vi.fn(),
    isClaimable: vi.fn(() => false),
    claim: vi.fn(),
    setSwapModePsbt: vi.fn(async () => {
      mode = 'psbt';
      emitSwapState(SpvFromBTCSwapState.CREATED);
    }),
    returnToIntermediateWalletSwapMode: vi.fn(async () => {
      mode = 'intermediate_wallet';
      emitSwapState(SpvFromBTCSwapState.CREATED);
    }),
    setSwapModeIntermediateWallet: vi.fn(async () => {
      mode = 'intermediate_wallet';
      emitSwapState(SpvFromBTCSwapState.CREATED);
    }),
    emitSwapMode: (nextMode: 'psbt' | 'intermediate_wallet') => {
      mode = nextMode;
      emitSwapState(SpvFromBTCSwapState.CREATED);
    },
  };
  return quote;
}

function makeIntermediate(overrides?: Record<string, any>) {
  const wallet = {
    getReceiveAddress: () => 'bc1qintermediate',
  };
  return {
    wallet,
    address: 'bc1qintermediate',
    confirmedBalance: 0n,
    unconfirmedBalance: 0n,
    refreshBalance: vi.fn().mockResolvedValue({
      confirmedBalance: 0n,
      unconfirmedBalance: 0n,
    }),
    backupAcknowledged: true,
    openMnemonicBackupModal: vi.fn(),
    openSendBitcoinModal: vi.fn(),
    loading: false,
    ...overrides,
  };
}

function makeExtensionWallet() {
  return {
    name: 'Browser wallet',
    icon: '/wallet.svg',
    address: 'bc1qextension',
    instance: {},
  };
}

function makeWrapper(
  connectWallet = vi.fn().mockResolvedValue(false),
  disconnectWallet = vi.fn().mockResolvedValue(undefined),
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ChainsContext.Provider
        value={
          {
            chains: {},
            connectWallet,
            disconnectWallet,
            changeWallet: vi.fn(),
          } as any
        }
      >
        {children}
      </ChainsContext.Provider>
    );
  };
}

async function clickInitialize(result: { current: any }) {
  await waitFor(() =>
    expect(result.current.step1init?.init.disabled).toBe(false),
  );
  await act(async () => {
    result.current.step1init.init.onClick();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useSpvVaultFromBtcQuote payment step', () => {
  beforeEach(() => {
    window.localStorage.clear();
    hookState.wallet = null;
    hookState.intermediate = makeIntermediate();
    hookState.swapStateCallback = null;
    hookState.swapState = {
      state: SpvFromBTCSwapState.CREATED,
      totalQuoteTime: 120,
      quoteTimeRemaining: 90,
      isInitiated: false,
    };
    vi.restoreAllMocks();
  });

  it('pays a PSBT quote with the extension wallet and normalized fee rate', async () => {
    const extensionWallet = makeExtensionWallet();
    hookState.wallet = extensionWallet;
    const quote = makeQuote({ mode: 'psbt' });
    const uiCallback = vi.fn();
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, uiCallback, 3),
      { wrapper: makeWrapper() },
    );

    expect(result.current.step1init).toBeDefined();
    expect(result.current.step2paymentWait).toBeUndefined();

    await clickInitialize(result);

    expect(quote.sendBitcoinTransaction).toHaveBeenCalledWith(
      extensionWallet.instance,
      5,
    );
    expect(uiCallback).toHaveBeenCalledOnce();
    expect(uiCallback).toHaveBeenCalledWith(quote, 'hide');
  });

  it('uses the same payment action for a fully funded intermediate wallet', async () => {
    hookState.wallet = {
      name: 'Intermediate wallet',
      icon: '/bitcoin.svg',
      address: 'bc1qintermediate',
      instance: hookState.intermediate.wallet,
      onlyInput: true,
    };
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: false,
    });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn(), 12),
      { wrapper: makeWrapper() },
    );

    expect(result.current.step1init).toBeDefined();
    expect(result.current.step1init.note).toEqual({
      willExecuteAutomatically: true,
      requiredAdditionalDeposit: undefined,
    });
    await clickInitialize(result);

    expect(quote.sendBitcoinTransaction).toHaveBeenCalledWith(
      hookState.intermediate.wallet,
      undefined,
    );
  });

  it('describes an additional deposit only when existing balance contributes to the swap', async () => {
    const partialDepositQuote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      inputAmount: 100_000n,
      externalDepositAmount: 25_000n,
    });
    const { result, unmount } = renderHook(
      () => useSpvVaultFromBtcQuote(partialDepositQuote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(result.current.step1init?.init.loading).toBe(false),
    );
    expect(result.current.step1init?.note?.willExecuteAutomatically).toBe(false);
    expect(
      result.current.step1init?.note?.requiredAdditionalDeposit?.toString(),
    ).toBe(makeAmount(25_000n).toString());

    unmount();

    const fullDepositQuote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      inputAmount: 25_000n,
      externalDepositAmount: 25_000n,
    });
    const fullDeposit = renderHook(
      () => useSpvVaultFromBtcQuote(fullDepositQuote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(fullDeposit.result.current.step1init?.init.loading).toBe(false),
    );
    expect(fullDeposit.result.current.step1init?.note).toBeUndefined();
  });

  it('reopens backup instead of sending a fully funded intermediate wallet', async () => {
    hookState.intermediate = makeIntermediate({
      backupAcknowledged: false,
    });
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: false,
    });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    expect(hookState.intermediate.openMnemonicBackupModal).not.toHaveBeenCalled();
    await clickInitialize(result);

    expect(hookState.intermediate.openMnemonicBackupModal).toHaveBeenCalledTimes(1);
    expect(quote.sendBitcoinTransaction).not.toHaveBeenCalled();
    expect(result.current.step2paymentWait).toBeUndefined();
  });

  it('disables initialization when the connected extension balance is insufficient', async () => {
    hookState.wallet = makeExtensionWallet();
    const quote = makeQuote({ mode: 'psbt' });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn(), 5, 50_000n),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(result.current.step1init.init.loading).toBe(false),
    );
    expect(result.current.step1init.init.disabled).toBe(true);
    expect(quote.sendBitcoinTransaction).not.toHaveBeenCalled();
    expect(result.current.step2paymentWait).toBeUndefined();
  });

  it('opens the backup gate on initialization without delaying deposit waiting', async () => {
    hookState.intermediate = makeIntermediate({
      backupAcknowledged: false,
    });
    const waitForExternalDeposit = pendingWait();
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const { result, rerender } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    expect(waitForExternalDeposit).not.toHaveBeenCalled();
    expect(hookState.intermediate.openMnemonicBackupModal).not.toHaveBeenCalled();
    expect(result.current.step1init).toBeDefined();
    expect(result.current.step2paymentWait).toBeUndefined();

    await clickInitialize(result);

    await waitFor(() =>
      expect(result.current.step2paymentWait?.backupRequired).toBeDefined(),
    );
    expect(waitForExternalDeposit).toHaveBeenCalledTimes(1);
    expect(hookState.intermediate.openMnemonicBackupModal).toHaveBeenCalledTimes(1);

    act(() => result.current.step2paymentWait.backupRequired.backup());
    expect(hookState.intermediate.openMnemonicBackupModal).toHaveBeenCalledTimes(2);

    hookState.intermediate = {
      ...hookState.intermediate,
      backupAcknowledged: true,
    };
    rerender();

    expect(result.current.step2paymentWait.backupRequired).toBeUndefined();
    expect(result.current.step2paymentWait.walletDisconnected.address.value).toBe(
      'bc1qdeposit',
    );
    expect(waitForExternalDeposit).toHaveBeenCalledTimes(1);
  });

  it('shows the backup gate without auto-opening it for a recovered initiated quote', async () => {
    hookState.intermediate = makeIntermediate({
      backupAcknowledged: false,
    });
    hookState.swapState = {
      ...hookState.swapState,
      isInitiated: true,
    };
    const waitForExternalDeposit = pendingWait();
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(result.current.step2paymentWait?.backupRequired).toBeDefined(),
    );
    expect(waitForExternalDeposit).toHaveBeenCalledTimes(1);
    expect(hookState.intermediate.openMnemonicBackupModal).not.toHaveBeenCalled();

    act(() => result.current.step2paymentWait.backupRequired.backup());
    expect(hookState.intermediate.openMnemonicBackupModal).toHaveBeenCalledTimes(1);
  });

  it('resumes external deposit waiting for an SDK-initiated quote', async () => {
    hookState.swapState = {
      ...hookState.swapState,
      isInitiated: true,
    };
    const waitForExternalDeposit = pendingWait();
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    expect(result.current.step1init).toBeUndefined();
    expect(result.current.step2paymentWait).toBeDefined();
    await waitFor(() =>
      expect(waitForExternalDeposit).toHaveBeenCalledTimes(1),
    );
  });

  it('waits for an exact deposit and continues through the existing send path', async () => {
    const waitForExternalDeposit = vi.fn().mockResolvedValue({});
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });

    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    expect(waitForExternalDeposit).not.toHaveBeenCalled();
    await clickInitialize(result);

    await waitFor(() =>
      expect(quote.sendBitcoinTransaction).toHaveBeenCalledWith(
        hookState.intermediate.wallet,
        undefined,
      ),
    );
    expect(waitForExternalDeposit).toHaveBeenCalledWith(
      hookState.intermediate.wallet,
      undefined,
      5,
      undefined,
      expect.any(AbortSignal),
    );
    expect(hookState.intermediate.refreshBalance).toHaveBeenCalledTimes(1);
    expect((quote as any).execute).toBeUndefined();
  });

  it('moves an SDK invalid deposit to the failed terminal state', async () => {
    const invalidDeposits = [
      {
        key: 'tx:0',
        utxo: {},
        reason: 'amount_too_small' as const,
        requiredAmount: 25_000n,
        actualAmount: 20_000n,
      },
    ];
    const waitForExternalDeposit = vi
      .fn()
      .mockRejectedValue(new InvalidBitcoinDepositError(invalidDeposits as any));
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const { result, rerender } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await clickInitialize(result);

    await waitFor(() =>
      expect(result.current.step6?.state).toBe('failed'),
    );
    expect(result.current.step2paymentWait).toBeUndefined();
    expect(result.current.step6.errorTitle).toBe('BTC amount too low');
    expect(result.current.step6.errorMessage).toContain(
      'already deposited Bitcoin balance will be used',
    );
    expect(result.current.executionSteps[0].text).toBe(
      'Invalid Bitcoin deposit',
    );
    expect(hookState.intermediate.refreshBalance).toHaveBeenCalledTimes(1);
    expect(quote.sendBitcoinTransaction).not.toHaveBeenCalled();

    rerender();
    expect(waitForExternalDeposit).toHaveBeenCalledTimes(1);
  });

  it('shows an uninitialized expired quote without implying that funds were sent', async () => {
    hookState.swapState = {
      ...hookState.swapState,
      state: SpvFromBTCSwapState.QUOTE_EXPIRED,
      isInitiated: false,
    };
    const quote = makeQuote({ mode: 'psbt' });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.step6).toEqual({
      state: 'expired_uninitialized',
      errorTitle: 'Swap expired',
      errorMessage: 'Swap has expired, please create a new quote!',
    });
    expect(result.current.executionSteps).toBeUndefined();
  });

  it('uses the deposited-balance recovery copy for an initialized intermediate quote', async () => {
    hookState.swapState = {
      ...hookState.swapState,
      state: SpvFromBTCSwapState.QUOTE_EXPIRED,
      isInitiated: true,
    };
    const quote = makeQuote({ mode: 'intermediate_wallet' });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.step6?.state).toBe('expired');
    expect(result.current.step6?.errorTitle).toBe('Swap expired');
    expect(result.current.step6?.errorMessage).toContain(
      'already deposited Bitcoin balance will be used automatically',
    );
    expect(result.current.executionSteps).toBeDefined();
  });

  it('treats soft expiry as terminal while an external-deposit wait is active', async () => {
    const waitForExternalDeposit = pendingWait();
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const { result, rerender, unmount } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn()),
      { wrapper: makeWrapper() },
    );

    await clickInitialize(result);
    await waitFor(() =>
      expect(result.current.step2paymentWait).toBeDefined(),
    );

    act(() => {
      emitSwapState(SpvFromBTCSwapState.QUOTE_SOFT_EXPIRED, true);
      rerender();
    });

    expect(result.current.step2paymentWait).toBeUndefined();
    expect(result.current.step6?.state).toBe('expired');
    expect(waitForExternalDeposit).toHaveBeenCalledTimes(1);

    await act(async () => {
      unmount();
      await Promise.resolve();
    });
  });

  it('switches to PSBT mode after browser connection and pays exactly once', async () => {
    const waitForExternalDeposit = pendingWait();
    const quote = makeQuote({
      mode: 'intermediate_wallet',
      requiresDeposit: true,
      waitForExternalDeposit,
    });
    const extensionWallet = makeExtensionWallet();
    const connectWallet = vi.fn(async () => {
      hookState.wallet = extensionWallet;
      return true;
    });
    const { result } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn(), 7),
      { wrapper: makeWrapper(connectWallet) },
    );

    await clickInitialize(result);

    await waitFor(() =>
      expect(result.current.step2paymentWait?.walletDisconnected).toBeDefined(),
    );
    await act(async () => {
      await result.current.step2paymentWait.walletDisconnected.payWithBrowserWallet.onClick();
    });

    await waitFor(() =>
      expect(quote.sendBitcoinTransaction).toHaveBeenCalledTimes(1),
    );
    expect(quote.setSwapModePsbt).toHaveBeenCalledWith(false);
    expect(quote.setSwapModePsbt.mock.invocationCallOrder[0]).toBeLessThan(
      quote.sendBitcoinTransaction.mock.invocationCallOrder[0],
    );
    expect(quote.sendBitcoinTransaction).toHaveBeenCalledWith(
      extensionWallet.instance,
      7,
    );
    await waitFor(() =>
      expect(waitForExternalDeposit.mock.calls[0][4].aborted).toBe(true),
    );
  });

  it('restores intermediate mode after disconnecting an extension wallet', async () => {
    const extensionWallet = makeExtensionWallet();
    hookState.wallet = extensionWallet;
    hookState.swapState = {
      ...hookState.swapState,
      isInitiated: true,
    };
    const quote = makeQuote({ mode: 'psbt' });
    quote.returnToIntermediateWalletSwapMode.mockRejectedValueOnce(
      new Error('No retained metadata'),
    );
    const disconnectWallet = vi.fn(async () => {
      hookState.wallet = null;
    });
    const { result, rerender } = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn(), 6),
      { wrapper: makeWrapper(undefined, disconnectWallet) },
    );

    await act(async () => {
      await result.current.step2paymentWait.walletConnected.useExternalWallet.onClick();
    });
    rerender();

    await waitFor(() =>
      expect(quote.setSwapModeIntermediateWallet).toHaveBeenCalledWith(
        hookState.intermediate.wallet,
        undefined,
        6,
      ),
    );
    expect(disconnectWallet).toHaveBeenCalledTimes(1);
    expect(quote.returnToIntermediateWalletSwapMode).toHaveBeenCalledTimes(1);
    expect(
      disconnectWallet.mock.invocationCallOrder[0],
    ).toBeLessThan(
      quote.returnToIntermediateWalletSwapMode.mock.invocationCallOrder[0],
    );
  });

  it('finishes an active mode switch before applying the latest desired mode', async () => {
    const intermediateSwitch = deferred();
    const extensionWallet = makeExtensionWallet();
    const quote = makeQuote({mode: 'psbt'});
    quote.returnToIntermediateWalletSwapMode.mockImplementationOnce(async () => {
      await intermediateSwitch.promise;
      quote.emitSwapMode('intermediate_wallet');
    });

    const {rerender} = renderHook(
      () => useSpvVaultFromBtcQuote(quote as any, vi.fn(), 6),
      {wrapper: makeWrapper()},
    );

    await waitFor(() =>
      expect(quote.returnToIntermediateWalletSwapMode).toHaveBeenCalledTimes(1),
    );

    hookState.wallet = extensionWallet;
    rerender();
    expect(quote.setSwapModePsbt).not.toHaveBeenCalled();

    await act(async () => {
      intermediateSwitch.resolve();
      await intermediateSwitch.promise;
    });

    await waitFor(() =>
      expect(quote.setSwapModePsbt).toHaveBeenCalledWith(false),
    );
    expect(quote.getSwapMode()).toBe('psbt');
    expect(
      quote.returnToIntermediateWalletSwapMode.mock.invocationCallOrder[0],
    ).toBeLessThan(quote.setSwapModePsbt.mock.invocationCallOrder[0]);
  });
});
