import * as React from 'react';
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventEmitter from 'events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwapperContext } from '../../../context/SwapperContext';
import { IntermediateBitcoinWalletSendModal } from '../IntermediateBitcoinWalletSendModal';

const DESTINATION = 'bc1qvaliddestination';

function renderWithSwapper(
  element: React.ReactElement,
  isValidBitcoinAddress = (address: string): boolean => address === DESTINATION
) {
  const swapper = {
    Utils: {
      isValidBitcoinAddress: vi.fn(isValidBitcoinAddress),
    },
  } as any;

  return render(element, {
    wrapper: ({ children }) => (
      <SwapperContext.Provider
        value={{
          swapper,
          initializedSwapper: swapper,
          loading: false,
          syncing: false,
          events: new EventEmitter(),
        }}
      >
        {children}
      </SwapperContext.Provider>
    ),
  });
}

function makeWallet() {
  return {
    getSpendableBalance: vi
      .fn()
      .mockResolvedValueOnce({
        balance: 100_000n,
        feeRate: 2,
        totalFee: 500,
      })
      .mockResolvedValue({
        balance: 99_400n,
        feeRate: 2,
        totalFee: 600,
      }),
    getTransactionFee: vi.fn().mockResolvedValue(700),
    sendTransaction: vi.fn().mockResolvedValue('transaction-id'),
  } as any;
}

function renderModal(wallet = makeWallet()) {
  const refreshBalance = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const result = renderWithSwapper(
    <IntermediateBitcoinWalletSendModal
      opened={true}
      close={close}
      wallet={wallet}
      refreshBalance={refreshBalance}
    />
  );
  return {
    ...result,
    wallet,
    refreshBalance,
    close,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IntermediateBitcoinWalletSendModal', () => {
  it('selects Max before an address and readjusts it for the destination', async () => {
    const { wallet, refreshBalance } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe('0.00100000'));

    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: DESTINATION },
    });

    await waitFor(() =>
      expect(wallet.getSpendableBalance).toHaveBeenLastCalledWith(
        undefined,
        undefined,
        DESTINATION
      )
    );
    await waitFor(() => expect(amountInput.value).toBe('0.00099400'));
    expect(screen.getByText('600 sats (0.00000600 BTC)')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Send BTC' }));

    await waitFor(() =>
      expect(wallet.sendTransaction).toHaveBeenCalledWith(DESTINATION, 99_400n, 2)
    );
    await waitFor(() => expect(screen.getByText('BTC sent')).not.toBeNull());
    expect((screen.getByLabelText('Transaction ID') as HTMLInputElement).value).toBe(
      'transaction-id'
    );
    expect(refreshBalance).toHaveBeenCalledTimes(1);
  });

  it('exits Max mode on manual input and estimates the matching fee', async () => {
    const { wallet } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: DESTINATION },
    });
    await waitFor(() => expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(2));

    const amountInput = screen.getByLabelText('Amount') as HTMLInputElement;
    fireEvent.change(amountInput, {
      target: { value: '0.00050000' },
    });

    await waitFor(() =>
      expect(wallet.getTransactionFee).toHaveBeenCalledWith(DESTINATION, 50_000n, 2)
    );
    expect(screen.getByText('700 sats (0.00000700 BTC)')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Send BTC' }));
    await waitFor(() =>
      expect(wallet.sendTransaction).toHaveBeenCalledWith(DESTINATION, 50_000n, 2)
    );
  });

  it('does not calculate or send for an invalid destination', async () => {
    const { wallet } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: 'not-a-bitcoin-address' },
    });

    await waitFor(() => expect(screen.getByText('Invalid Bitcoin address')).not.toBeNull());
    expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole('button', {
          name: 'Send BTC',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
  });

  it('ignores a stale maximum returned for a previous destination', async () => {
    let resolveFirst: (value: any) => void;
    let resolveSecond: (value: any) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    const wallet = {
      getSpendableBalance: vi
        .fn()
        .mockResolvedValueOnce({
          balance: 100_000n,
          feeRate: 2,
          totalFee: 500,
        })
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(second),
      getTransactionFee: vi.fn(),
      sendTransaction: vi.fn(),
    } as any;

    renderWithSwapper(
      <IntermediateBitcoinWalletSendModal
        opened={true}
        close={vi.fn()}
        wallet={wallet}
        refreshBalance={vi.fn().mockResolvedValue(undefined)}
      />,
      (address) => address === 'bc1qfirst' || address === 'bc1qsecond'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('0.00100000')
    );

    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: 'bc1qfirst' },
    });
    await waitFor(() => expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: 'bc1qsecond' },
    });
    expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirst({
        balance: 90_000n,
        feeRate: 2,
        totalFee: 900,
      });
      await first;
    });
    await waitFor(() => expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(3));

    await act(async () => {
      resolveSecond({
        balance: 80_000n,
        feeRate: 2,
        totalFee: 800,
      });
      await second;
    });
    await waitFor(() =>
      expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('0.00080000')
    );
  });

  it('retains the form and permits retry after a broadcast error', async () => {
    const wallet = makeWallet();
    wallet.sendTransaction
      .mockRejectedValueOnce(new Error('broadcast failed'))
      .mockResolvedValueOnce('retry-transaction-id');
    renderModal(wallet);

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    fireEvent.change(screen.getByLabelText('Destination address'), {
      target: { value: DESTINATION },
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Send BTC',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false)
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send BTC' }));
    await waitFor(() => expect(screen.getByText('Unable to send BTC')).not.toBeNull());
    expect((screen.getByLabelText('Destination address') as HTMLInputElement).value).toBe(
      DESTINATION
    );
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('0.00099400');

    fireEvent.click(screen.getByRole('button', { name: 'Send BTC' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Transaction ID') as HTMLInputElement).value).toBe(
        'retry-transaction-id'
      )
    );
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it('fetches a fresh spendable balance after closing and reopening', async () => {
    const wallet = makeWallet();
    const props = {
      close: vi.fn(),
      wallet,
      refreshBalance: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = renderWithSwapper(
      <IntermediateBitcoinWalletSendModal opened={true} {...props} />
    );
    await waitFor(() => expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(1));

    rerender(<IntermediateBitcoinWalletSendModal opened={false} {...props} />);
    rerender(<IntermediateBitcoinWalletSendModal opened={true} {...props} />);

    await waitFor(() => expect(wallet.getSpendableBalance).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Destination address') as HTMLInputElement).value).toBe('');
  });
});
