import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BitcoinTokens, toTokenAmount } from '@atomiqlabs/sdk';
import BigNumber from 'bignumber.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSwapPage } from '../../hooks/pages/useSwapPage';
import { SwapNew } from '../SwapNew';

vi.mock('../../hooks/pages/useSwapPage', () => ({
  useSwapPage: vi.fn(),
}));

vi.mock('../../components/qrscanner/QRScannerModal', () => ({
  QRScannerModal: () => null,
}));

vi.mock('../../components/ValidatedInput', () => ({
  default: () => <div data-testid="validated-input" />,
}));

vi.mock('../../components/tokens/TokensDropdown', () => ({
  TokensDropdown: () => <div data-testid="tokens-dropdown" />,
}));

vi.mock('../../components/swaps/SwapStepAlert', () => ({
  SwapStepAlert: () => null,
}));

vi.mock('../../components/_deprecated/AuditedBy', () => ({
  AuditedBy: () => null,
}));

vi.mock('../../components/wallets/WalletInfoBadge', () => ({
  WalletInfoBadge: (props: any) => (
    <div
      data-testid={props.input ? 'input-wallet-badge' : 'output-wallet-badge'}
      data-amount={props.maxSpendable?.amount ?? ''}
    >
      {props.setMax ? (
        <button data-testid="input-wallet-max" onClick={props.setMax}>
          max
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../../components/swappanels/SwapPanel', () => ({
  SwapPanel: (props: any) => (
    <output data-testid="swap-panel-balance">
      {props.balance == null ? 'undefined' : props.balance.toString()}
    </output>
  ),
}));

vi.mock('../../components/fees/PlaceholderFeePanel', () => ({
  PlaceholderFeePanel: () => null,
}));

vi.mock('../../components/fees/SwapFeePanel', () => ({
  SwapFeePanel: () => null,
}));

vi.mock('../../components/layout/SiteFooterView', () => ({
  SiteFooterView: () => null,
}));

const prices = {
  getUsdValue: vi.fn().mockResolvedValue(0),
};

function amount(rawAmount: bigint) {
  return toTokenAmount(rawAmount, BitcoinTokens.BTC, prices as any);
}

function makeSwapPage(wallet: {
  spendable?: ReturnType<typeof amount>;
  displayBalance?: ReturnType<typeof amount>;
}) {
  const onInputAmountChange = vi.fn();
  return {
    page: {
      hideUI: false,
      input: {
        wallet: {
          data: {
            name: 'Intermediate wallet',
            icon: '/bitcoin.svg',
            instance: {},
          },
          spendable: wallet.spendable,
          displayBalance: wallet.displayBalance,
          btcFeeRate: undefined,
          disconnect: vi.fn(),
        },
        token: {
          value: BitcoinTokens.BTC,
          values: [BitcoinTokens.BTC],
          onChange: vi.fn(),
          disabled: false,
        },
        amount: {
          value: '',
          onChange: onInputAmountChange,
          disabled: false,
          loading: false,
          step: new BigNumber('0.00000001'),
          min: new BigNumber(0),
          max: new BigNumber(1),
        },
        chainId: 'BITCOIN',
      },
      changeDirection: vi.fn(),
      output: {
        token: {
          value: BitcoinTokens.BTC,
          values: [BitcoinTokens.BTC],
          onChange: vi.fn(),
          disabled: false,
        },
        amount: {
          value: '',
          onChange: vi.fn(),
          disabled: false,
          loading: false,
          step: new BigNumber('0.00000001'),
          min: new BigNumber(0),
          max: new BigNumber(1),
          isFromAddress: false,
        },
        chainId: 'STARKNET',
      },
      smartChainId: 'STARKNET',
      swapType: 0,
      swapTypeData: {
        requiresInputWallet: false,
        requiresOutputWallet: false,
        supportsGasDrop: false,
      },
      quote: {
        loading: false,
        quote: {},
        isRandom: false,
        error: undefined,
        refresh: vi.fn(),
        abort: vi.fn(),
        UICallback: vi.fn(),
      },
      swapButtonHint: 'Swap',
    } as any,
    onInputAmountChange,
  };
}

describe('SwapNew wallet balance roles', () => {
  beforeEach(() => {
    vi.mocked(useSwapPage).mockReset();
  });

  it('uses displayBalance for the badge and Max without supplying an execution balance', () => {
    const displayBalance = amount(125_000n);
    const { page, onInputAmountChange } = makeSwapPage({
      spendable: undefined,
      displayBalance,
    });
    vi.mocked(useSwapPage).mockReturnValue(page);

    render(<SwapNew />);

    expect(screen.getByTestId('input-wallet-badge').getAttribute('data-amount')).toBe(
      '0.00125000',
    );
    fireEvent.click(screen.getByTestId('input-wallet-max'));
    expect(onInputAmountChange).toHaveBeenCalledWith('0.00125000');
    expect(screen.getByTestId('swap-panel-balance').textContent).toBe('undefined');
  });
});
