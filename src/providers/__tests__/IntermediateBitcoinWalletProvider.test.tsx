import * as React from 'react';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import EventEmitter from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SwapperContext } from '../../context/SwapperContext';
import { useIntermediateBitcoinWallet } from '../../hooks/wallets/useIntermediateBitcoinWallet';
import { downloadTextFile } from '../../utils/Files';
import { IntermediateBitcoinWalletProvider } from '../IntermediateBitcoinWalletProvider';

vi.mock('../../utils/Files', () => ({
  downloadTextFile: vi.fn(),
}));

const INTERMEDIATE_BTC_MNEMONIC_KEY =
  'atomiq-intermediate-btc-mnemonic-v1';
const INTERMEDIATE_BTC_BALANCE_POLL_MS = 60_000;

const STORED_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const RECOVERED_MNEMONIC =
  'legal winner thank year wave sausage worth useful legal winner thank yellow';

type StoredWalletData = {
  mnemonic: string;
  acknowledged?: boolean;
};

function storeWalletData(
  mnemonic = STORED_MNEMONIC,
  acknowledged = false,
) {
  window.localStorage.setItem(
    INTERMEDIATE_BTC_MNEMONIC_KEY,
    JSON.stringify({ mnemonic, acknowledged }),
  );
}

function readWalletData(): StoredWalletData | null {
  const value = window.localStorage.getItem(INTERMEDIATE_BTC_MNEMONIC_KEY);
  return value == null ? null : JSON.parse(value);
}

function makeWallet(
  address: string,
  confirmedBalance = 0n,
  unconfirmedBalance = 0n,
) {
  return {
    getReceiveAddress: vi.fn().mockReturnValue(address),
    getPublicKey: vi.fn().mockReturnValue('02'.padEnd(66, '1')),
    getBalance: vi.fn().mockResolvedValue({
      confirmedBalance,
      unconfirmedBalance,
    }),
    getSpendableBalance: vi.fn(),
    getUtxoPool: vi.fn(),
  } as any;
}

function makeSwapper(utils: {
  createBitcoinWalletFromMnemonic: ReturnType<typeof vi.fn>;
  generateBitcoinWallet: ReturnType<typeof vi.fn>;
}) {
  return {
    Utils: utils,
  } as any;
}

function makeWrapper(swapper: any, strict = false) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const content = (
      <SwapperContext.Provider
        value={{
          swapper,
          initializedSwapper: swapper,
          loading: false,
          syncing: false,
          events: new EventEmitter(),
        }}
      >
        <IntermediateBitcoinWalletProvider>
          {children}
        </IntermediateBitcoinWalletProvider>
      </SwapperContext.Provider>
    );
    return strict ? <React.StrictMode>{content}</React.StrictMode> : content;
  };
}

function makeFile(content: string, name = 'backup.txt') {
  const file = new File([content], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: vi.fn().mockResolvedValue(content),
  });
  return file;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('IntermediateBitcoinWalletProvider', () => {
  it('restores the stored wallet record without exposing secret or public-key fields', async () => {
    const wallet = makeWallet('bc1qstored');
    const createBitcoinWalletFromMnemonic = vi.fn().mockResolvedValue(wallet);
    const generateBitcoinWallet = vi.fn();
    storeWalletData(STORED_MNEMONIC, true);

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet,
        }),
      ),
    });

    await waitFor(() => expect(result.current.wallet).toBe(wallet));
    expect(result.current.address).toBe('bc1qstored');
    expect(result.current.loading).toBe(false);
    expect(result.current.backupAcknowledged).toBe(true);
    expect(createBitcoinWalletFromMnemonic).toHaveBeenCalledTimes(1);
    expect(createBitcoinWalletFromMnemonic).toHaveBeenCalledWith(
      STORED_MNEMONIC,
    );
    expect(generateBitcoinWallet).not.toHaveBeenCalled();
    expect(result.current).not.toHaveProperty('mnemonic');
    expect(result.current).not.toHaveProperty('publicKey');
  });

  it('generates one wallet in Strict Mode and persists the combined wallet record', async () => {
    const wallet = makeWallet('bc1qgenerated');
    const createBitcoinWalletFromMnemonic = vi.fn().mockResolvedValue(wallet);
    const generateBitcoinWallet = vi.fn().mockResolvedValue({
      wallet,
      mnemonic: STORED_MNEMONIC,
    });

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet,
        }),
        true,
      ),
    });

    await waitFor(() =>
      expect(createBitcoinWalletFromMnemonic).toHaveBeenCalledWith(
        STORED_MNEMONIC,
      ),
    );
    await waitFor(() => expect(result.current.wallet).toBe(wallet));
    expect(generateBitcoinWallet).toHaveBeenCalledTimes(1);
    expect(readWalletData()).toEqual({
      mnemonic: STORED_MNEMONIC,
      acknowledged: false,
    });
  });

  it('keeps the stored record when automatic restoration fails', async () => {
    const restoreError = new Error(`invalid ${STORED_MNEMONIC}`);
    const createBitcoinWalletFromMnemonic = vi
      .fn()
      .mockRejectedValue(restoreError);
    const generateBitcoinWallet = vi.fn();
    storeWalletData(STORED_MNEMONIC, true);

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet,
        }),
      ),
    });

    await waitFor(() => expect(result.current.error).toBe(restoreError));
    expect(result.current.wallet).toBeUndefined();
    expect(generateBitcoinWallet).not.toHaveBeenCalled();
    expect(readWalletData()).toEqual({
      mnemonic: STORED_MNEMONIC,
      acknowledged: true,
    });
  });

  it('validates and eventually installs a mnemonic recovered from a formatted backup', async () => {
    const originalWallet = makeWallet('bc1qoriginal');
    const recoveredWallet = makeWallet('bc1qrecovered', 25_000n);
    const createBitcoinWalletFromMnemonic = vi
      .fn()
      .mockImplementation((mnemonic: string) =>
        Promise.resolve(
          mnemonic === RECOVERED_MNEMONIC
            ? recoveredWallet
            : originalWallet,
        ),
      );
    storeWalletData(STORED_MNEMONIC, false);

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });
    await waitFor(() => expect(result.current.wallet).toBe(originalWallet));

    await act(async () => {
      await result.current.recoverMnemonicBackup(
        makeFile(`Recovery phrase: ${RECOVERED_MNEMONIC}\n`),
      );
    });

    await waitFor(() => expect(result.current.wallet).toBe(recoveredWallet));
    await waitFor(() => expect(result.current.confirmedBalance).toBe(25_000n));
    expect(result.current.address).toBe('bc1qrecovered');
    expect(readWalletData()).toEqual({
      mnemonic: RECOVERED_MNEMONIC,
      acknowledged: true,
    });
    expect(result.current.backupAcknowledged).toBe(true);
    expect(createBitcoinWalletFromMnemonic).toHaveBeenLastCalledWith(
      RECOVERED_MNEMONIC,
    );
  });

  it('rejects an invalid recovery file without changing the active wallet record', async () => {
    const originalWallet = makeWallet('bc1qoriginal');
    const recoveryError = new Error(`invalid ${RECOVERED_MNEMONIC}`);
    const createBitcoinWalletFromMnemonic = vi
      .fn()
      .mockResolvedValueOnce(originalWallet)
      .mockRejectedValueOnce(recoveryError);
    storeWalletData(STORED_MNEMONIC, false);

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });
    await waitFor(() => expect(result.current.wallet).toBe(originalWallet));

    await expect(
      result.current.recoverMnemonicBackup(makeFile(RECOVERED_MNEMONIC)),
    ).rejects.toBe(recoveryError);

    expect(result.current.wallet).toBe(originalWallet);
    expect(result.current.address).toBe('bc1qoriginal');
    expect(result.current.error).toBeNull();
    expect(readWalletData()).toEqual({
      mnemonic: STORED_MNEMONIC,
      acknowledged: false,
    });
  });

  it('rejects empty and oversized recovery files before SDK validation', async () => {
    const wallet = makeWallet('bc1qoriginal');
    const createBitcoinWalletFromMnemonic = vi.fn().mockResolvedValue(wallet);
    storeWalletData();

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic,
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });
    await waitFor(() => expect(result.current.wallet).toBe(wallet));
    createBitcoinWalletFromMnemonic.mockClear();

    await expect(
      result.current.recoverMnemonicBackup(makeFile('')),
    ).rejects.toThrow('Unable to recover intermediate Bitcoin wallet');

    const oversized = makeFile('x'.repeat(64 * 1024 + 1));
    await expect(
      result.current.recoverMnemonicBackup(oversized),
    ).rejects.toThrow('Unable to recover intermediate Bitcoin wallet');
    expect(createBitcoinWalletFromMnemonic).not.toHaveBeenCalled();
  });

  it('fails fast when the consumer hook is outside the provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => renderHook(() => useIntermediateBitcoinWallet())).toThrow(
      'useIntermediateBitcoinWallet must be used within IntermediateBitcoinWalletProvider',
    );
    consoleError.mockRestore();
  });

  it('reads and exposes only the wallet raw balance after initialization', async () => {
    const wallet = makeWallet('bc1qbalance', 31_000n, 4_000n);
    storeWalletData();

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic: vi.fn().mockResolvedValue(wallet),
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });

    await waitFor(() =>
      expect(result.current.confirmedBalance).toBe(31_000n),
    );
    expect(result.current.unconfirmedBalance).toBe(4_000n);
    expect(wallet.getBalance).toHaveBeenCalledTimes(1);
    expect(wallet.getSpendableBalance).not.toHaveBeenCalled();
    expect(wallet.getUtxoPool).not.toHaveBeenCalled();
  });

  it('executes concurrent manual raw-balance refreshes independently', async () => {
    const wallet = makeWallet('bc1qbalance', 1n, 0n);
    let resolveBalance: (
      balance: { confirmedBalance: bigint; unconfirmedBalance: bigint },
    ) => void;
    const pendingBalance = new Promise<{
      confirmedBalance: bigint;
      unconfirmedBalance: bigint;
    }>((resolve) => {
      resolveBalance = resolve;
    });
    storeWalletData();

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic: vi.fn().mockResolvedValue(wallet),
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });
    await waitFor(() => expect(result.current.confirmedBalance).toBe(1n));
    wallet.getBalance.mockClear();
    wallet.getBalance.mockReturnValue(pendingBalance);

    let firstRefresh: Promise<any>;
    let secondRefresh: Promise<any>;
    act(() => {
      firstRefresh = result.current.refreshBalance();
      secondRefresh = result.current.refreshBalance();
    });

    expect(wallet.getBalance).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveBalance({ confirmedBalance: 9n, unconfirmedBalance: 2n });
      await Promise.all([firstRefresh, secondRefresh]);
    });
    expect(result.current.confirmedBalance).toBe(9n);
    expect(result.current.unconfirmedBalance).toBe(2n);
  });

  it('polls every minute and lets tryWithRetries recover a failed poll', async () => {
    vi.useFakeTimers();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const wallet = makeWallet('bc1qpoll');
    wallet.getBalance
      .mockResolvedValueOnce({ confirmedBalance: 1n, unconfirmedBalance: 0n })
      .mockRejectedValueOnce(new Error('private backend detail'))
      .mockResolvedValueOnce({ confirmedBalance: 2n, unconfirmedBalance: 3n });
    storeWalletData();

    const { result } = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(
        makeSwapper({
          createBitcoinWalletFromMnemonic: vi.fn().mockResolvedValue(wallet),
          generateBitcoinWallet: vi.fn(),
        }),
      ),
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(wallet.getBalance).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERMEDIATE_BTC_BALANCE_POLL_MS);
    });
    expect(wallet.getBalance).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(wallet.getBalance).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(wallet.getBalance).toHaveBeenCalledTimes(3);
    expect(result.current.confirmedBalance).toBe(2n);
    expect(result.current.unconfirmedBalance).toBe(3n);
    expect(result.current.error).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      'tryWithRetries(): error on try number: 0',
      expect.any(Error),
    );
  });

  it('downloads the mnemonic and persists acknowledgement in the wallet record', async () => {
    const wallet = makeWallet('bc1qbackup');
    const swapper = makeSwapper({
      createBitcoinWalletFromMnemonic: vi.fn().mockResolvedValue(wallet),
      generateBitcoinWallet: vi.fn(),
    });
    storeWalletData(STORED_MNEMONIC, false);

    const { result, unmount } = renderHook(
      () => useIntermediateBitcoinWallet(),
      {
        wrapper: makeWrapper(swapper),
      },
    );
    await waitFor(() => expect(result.current.wallet).toBe(wallet));
    expect(result.current.backupAcknowledged).toBe(false);

    act(() => result.current.downloadMnemonicBackup());
    expect(downloadTextFile).toHaveBeenCalledTimes(1);
    const [filename, content] = vi.mocked(downloadTextFile).mock.calls[0];
    expect(filename).toBe(
      'atomiq-intermediate-bitcoin-wallet-backup.txt',
    );
    expect(content).toContain('bc1qbackup');
    expect(content).toContain(`Recovery phrase: ${STORED_MNEMONIC}`);
    expect(content.toLowerCase()).toContain('warning');

    act(() => result.current.acknowledgeBackup());
    expect(readWalletData()).toEqual({
      mnemonic: STORED_MNEMONIC,
      acknowledged: true,
    });
    expect(result.current.backupAcknowledged).toBe(true);

    unmount();
    const remounted = renderHook(() => useIntermediateBitcoinWallet(), {
      wrapper: makeWrapper(swapper),
    });
    await waitFor(() => expect(remounted.result.current.wallet).toBe(wallet));
    expect(remounted.result.current.backupAcknowledged).toBe(true);
  });
});
