import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BitcoinTokens, toTokenAmount } from '@atomiqlabs/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpvVaultFromBtcQuote } from '../../../../../hooks/swaps/useSpvVaultFromBtcQuote';
import { SpvVaultFromBTCSwapPanel } from '../SpvVaultFromBTCSwapPanel';

vi.mock('../../../../../hooks/swaps/useSpvVaultFromBtcQuote', () => ({
  useSpvVaultFromBtcQuote: vi.fn(),
}));

vi.mock('../../../../fees/SwapFeePanel', () => ({
  SwapFeePanel: () => <div data-testid="swap-fees" />,
}));

vi.mock('../../../../swaps/ImportantNoticeModal', () => ({
  ImportantNoticeModal: (props: any) =>
    props.opened ? <div data-testid="copy-warning">{props.text}</div> : null,
}));

vi.mock('../../../../swaps/DisconnectedWalletQrAndAddress', () => ({
  DisconnectedWalletQrAndAddress: (props: any) => (
    <div
      data-testid="disconnected-wallet"
      data-address={props.address.value}
      data-hyperlink={props.address.hyperlink}
    >
      <div data-testid="deposit-alert">{props.alert}</div>
      <button onClick={props.payWithBrowserWallet.onClick}>
        {props.payWithBrowserWallet.text}
      </button>
      <button onClick={props.payWithDeeplink.onClick}>
        {props.payWithDeeplink.text}
      </button>
    </div>
  ),
}));

vi.mock('../../../../swaps/SwapExpiryProgressBar', () => ({
  SwapExpiryProgressBar: (props: any) => (
    <div
      data-testid="expiry"
      data-remaining={props.timeRemaining}
      data-total={props.totalTime}
      data-expiry-text={props.expiryText}
    />
  ),
}));

vi.mock('../../../../swaps/SwapConfirmations', () => ({
  SwapConfirmations: (props: any) => (
    <div data-testid="confirmations">{props.txData?.txId}</div>
  ),
}));

vi.mock('../../../../ScrollAnchor', () => ({
  ScrollAnchor: () => null,
}));

const prices = {
  getUsdValue: vi.fn().mockResolvedValue(0),
};

function amount(rawAmount: bigint) {
  return toTokenAmount(rawAmount, BitcoinTokens.BTC, prices as any);
}

function makeQuote() {
  return {
    chainIdentifier: 'STARKNET',
    getOutputTxId: vi.fn(() => '0xoutput'),
    getInput: vi.fn(() => amount(100_000n)),
  } as any;
}

function step1(overrides?: Record<string, any>) {
  return {
    init: {
      onClick: vi.fn(),
      disabled: false,
      loading: false,
    },
    expiry: {
      remaining: 90,
      total: 120,
    },
    ...overrides,
  };
}

function paymentStep(overrides?: Record<string, any>) {
  return {
    expiry: {
      remaining: 90,
      total: 120,
    },
    ...overrides,
  };
}

function renderPanel(page: any, refreshQuote = vi.fn()) {
  vi.mocked(useSpvVaultFromBtcQuote).mockReturnValue(page);
  render(
    <SpvVaultFromBTCSwapPanel
      quote={makeQuote()}
      refreshQuote={refreshQuote}
      UICallback={vi.fn()}
    />,
  );
  return { refreshQuote };
}

describe('SpvVaultFromBTCSwapPanel payment step', () => {
  beforeEach(() => {
    vi.mocked(useSpvVaultFromBtcQuote).mockReset();
  });

  it('shows fees and the initial Swap action before payment', () => {
    const initialize = vi.fn();
    renderPanel({
      step1init: step1({
        init: {
          onClick: initialize,
          disabled: false,
          loading: false,
        },
      }),
    });

    expect(screen.getByTestId('swap-fees')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('disconnected-wallet')).toBeNull();
  });

  it('shows how existing intermediate-wallet balance affects initialization', () => {
    const requiredAdditionalDeposit = amount(25_000n);
    renderPanel({
      step1init: step1({
        note: {
          willExecuteAutomatically: false,
          requiredAdditionalDeposit,
        },
      }),
    });

    expect(
      screen.getByText(
        `Will request an additional deposit of ${requiredAdditionalDeposit.toString()}`,
      ),
    ).toBeDefined();
    expect(
      screen.queryByText(
        'Will automatically execute with already deposited BTC balance',
      ),
    ).toBeNull();
  });

  it('shows both payment-source actions without repeating fees', () => {
    const pay = vi.fn();
    const useExternal = vi.fn();
    renderPanel({
      step2paymentWait: paymentStep({
        walletConnected: {
          bitcoinWallet: {
            name: 'Browser wallet',
            icon: '/wallet.svg',
            instance: {},
          },
          payWithBrowserWallet: {
            loading: false,
            onClick: pay,
          },
          useExternalWallet: {
            onClick: useExternal,
          },
        },
      }),
    });

    expect(screen.queryByTestId('swap-fees')).toBeNull();
    fireEvent.click(screen.getByText('Use a QR/wallet address'));
    expect(useExternal).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: /Browser wallet/}));
    expect(pay).toHaveBeenCalledTimes(1);
  });

  it('omits the external-wallet action for a fully funded intermediate wallet', () => {
    renderPanel({
      step2paymentWait: paymentStep({
        walletConnected: {
          bitcoinWallet: {
            name: 'Intermediate wallet',
            icon: '/bitcoin.svg',
            instance: {},
          },
          payWithBrowserWallet: {
            loading: false,
            onClick: vi.fn(),
          },
        },
      }),
    });

    expect(screen.getByRole('button', {name: /Intermediate wallet/})).toBeDefined();
    expect(screen.queryByText('Use a QR/wallet address')).toBeNull();
  });

  it('disables payment while the hook is preparing the selected wallet mode', () => {
    renderPanel({
      step2paymentWait: paymentStep({
        walletConnected: {
          bitcoinWallet: {
            name: 'Browser wallet',
            icon: '/wallet.svg',
            instance: {},
          },
          payWithBrowserWallet: {
            loading: false,
            disabled: true,
            onClick: vi.fn(),
          },
        },
      }),
    });

    expect(
      (screen.getByRole('button', {name: /Browser wallet/}) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('renders the backup page before either payment control', () => {
    const backup = vi.fn();
    renderPanel({
      step2paymentWait: paymentStep({
        backupRequired: { backup },
      }),
    });

    expect(screen.queryByTestId('disconnected-wallet')).toBeNull();
    expect(screen.queryByText('Browser wallet')).toBeNull();
    fireEvent.click(screen.getByText('Back up Bitcoin wallet'));
    expect(backup).toHaveBeenCalledTimes(1);
  });

  it('renders the SDK address, hyperlink, and additional deposit amount', () => {
    const expectedAmount = amount(25_000n);
    const payWithBrowserWallet = vi.fn();
    const payWithBitcoinWallet = vi.fn();
    const quote = makeQuote();
    vi.mocked(useSpvVaultFromBtcQuote).mockReturnValue({
      step2paymentWait: paymentStep({
        walletDisconnected: {
          address: {
            value: 'bc1qdeposit',
            hyperlink: 'bitcoin:bc1qdeposit?amount=0.00025',
            copy: vi.fn(),
          },
          payWithBrowserWallet: {
            loading: false,
            onClick: payWithBrowserWallet,
          },
          payWithBitcoinWallet: {
            onClick: payWithBitcoinWallet,
          },
          depositStatus: {
            expectedAmount,
          },
        },
      }),
    } as any);

    render(
      <SpvVaultFromBTCSwapPanel
        quote={quote}
        refreshQuote={vi.fn()}
        UICallback={vi.fn()}
      />,
    );

    const disconnected = screen.getByTestId('disconnected-wallet');
    expect(disconnected.getAttribute('data-address')).toBe('bc1qdeposit');
    expect(disconnected.getAttribute('data-hyperlink')).toBe(
      'bitcoin:bc1qdeposit?amount=0.00025',
    );
    expect(screen.getByTestId('deposit-alert').textContent).toContain(
      expectedAmount.toString(),
    );
    expect(quote.getInput).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Pay with browser wallet'));
    fireEvent.click(screen.getByText('Pay with BTC wallet'));
    expect(payWithBrowserWallet).toHaveBeenCalledTimes(1);
    expect(payWithBitcoinWallet).toHaveBeenCalledTimes(1);
  });

  it('uses the external deposit amount in the copy-warning modal', () => {
    const expectedAmount = amount(25_000n);
    renderPanel({
      step2paymentWait: paymentStep({
        walletDisconnected: {
          address: {
            value: 'bc1qdeposit',
            hyperlink: 'bitcoin:bc1qdeposit?amount=0.00025',
            copy: vi.fn(),
          },
          addressCopyWarningModal: {
            btcAmount: expectedAmount,
            close: vi.fn(),
            showAgain: {
              checked: true,
              onChange: vi.fn(),
            },
          },
          payWithBrowserWallet: {
            loading: false,
            onClick: vi.fn(),
          },
          payWithBitcoinWallet: {
            onClick: vi.fn(),
          },
          depositStatus: {
            expectedAmount,
          },
        },
      }),
    });

    expect(screen.getByTestId('copy-warning').textContent).toContain(
      expectedAmount.toString(),
    );
  });

  it('renders invalid-deposit failures as terminal swap results', () => {
    const refreshQuote = vi.fn();
    renderPanel(
      {
        step6: {
          state: 'failed',
          errorTitle: 'BTC amount too low',
          errorMessage:
            'The received deposit does not match the exact amount required by this swap.',
        },
      },
      refreshQuote,
    );

    expect(screen.getByText('BTC amount too low')).toBeDefined();
    expect(
      screen.getByText(
        'The received deposit does not match the exact amount required by this swap.',
      ),
    ).toBeDefined();
    expect(screen.queryByTestId('disconnected-wallet')).toBeNull();
    expect(screen.queryByTestId('swap-fees')).toBeNull();
    fireEvent.click(screen.getByText('New Swap'));
    expect(refreshQuote).toHaveBeenCalledTimes(1);
  });

  it('shows fees without a terminal warning for an uninitialized expiry', () => {
    const refreshQuote = vi.fn();
    renderPanel(
      {
        step6: {
          state: 'expired_uninitialized',
          errorTitle: 'Swap expired',
          errorMessage: 'Swap has expired, please create a new quote!',
        },
      },
      refreshQuote,
    );

    expect(screen.getByTestId('swap-fees')).toBeDefined();
    expect(screen.queryByText('Swap expired')).toBeNull();
    fireEvent.click(screen.getByText('New Swap'));
    expect(refreshQuote).toHaveBeenCalledTimes(1);
  });

  it('shows the terminal warning without fees for an initialized expiry', () => {
    renderPanel({
      step6: {
        state: 'expired',
        errorTitle: 'Swap expired',
        errorMessage: 'Already deposited Bitcoin balance will be used.',
      },
    });

    expect(screen.queryByTestId('swap-fees')).toBeNull();
    expect(screen.getByText('Swap expired')).toBeDefined();
    expect(
      screen.getByText('Already deposited Bitcoin balance will be used.'),
    ).toBeDefined();
  });

  it('keeps the expiry progress visible while awaiting payment', () => {
    renderPanel({
      step2paymentWait: paymentStep({
        backupRequired: { backup: vi.fn() },
      }),
    });

    const expiry = screen.getByTestId('expiry');
    expect(expiry.getAttribute('data-remaining')).toBe('90');
    expect(expiry.getAttribute('data-total')).toBe('120');
    expect(expiry.getAttribute('data-expiry-text')).toBe(
      'Quote expired, please do not send any funds!',
    );
  });

  it('preserves confirmation and success rendering', () => {
    const quote = makeQuote();
    vi.mocked(useSpvVaultFromBtcQuote).mockReturnValue({
      step4awaitingConfirmations: {
        txData: {
          txId: 'btc-tx',
        },
      },
    } as any);
    const { rerender } = render(
      <SpvVaultFromBTCSwapPanel
        quote={quote}
        refreshQuote={vi.fn()}
        UICallback={vi.fn()}
      />,
    );
    expect(screen.getByTestId('confirmations').textContent).toBe('btc-tx');

    vi.mocked(useSpvVaultFromBtcQuote).mockReturnValue({
      step6: {
        state: 'success',
      },
    } as any);
    rerender(
      <SpvVaultFromBTCSwapPanel
        quote={quote}
        refreshQuote={vi.fn()}
        UICallback={vi.fn()}
      />,
    );
    expect(screen.getByText('Swap success')).toBeDefined();
  });
});
