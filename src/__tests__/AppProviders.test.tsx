import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from '../App';

vi.mock('../pages/quickscan/QuickScan', () => ({ QuickScan: () => null }));
vi.mock('../pages/quickscan/QuickScanExecute', () => ({
  QuickScanExecute: () => null,
}));
vi.mock('../pages/HistoryPage', () => ({ HistoryPage: () => null }));
vi.mock('../components/layout/MainNavigation', () => ({
  MainNavigation: () => null,
}));
vi.mock('../pages/FAQPage', () => ({ FAQPage: () => null }));
vi.mock('../pages/AboutPage', () => ({ AboutPage: () => null }));
vi.mock('../pages/SwapForGas', () => ({ SwapForGas: () => null }));
vi.mock('../pages/SwapExplorer', () => ({ SwapExplorer: () => null }));
vi.mock('../pages/SwapNew', () => ({ SwapNew: () => null }));
vi.mock('../components/_deprecated/ErrorAlert', () => ({
  ErrorAlert: () => null,
}));
vi.mock('../components/layout/SocialFooter', () => ({
  SocialFooter: () => null,
}));
vi.mock('../pages/NotFound', () => ({ NotFound: () => null }));

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="router">{children}</div>
  ),
  Route: () => null,
  Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../providers/SwapperProvider', () => ({
  SwapperProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="swapper">{children}</div>
  ),
}));

vi.mock('../providers/IntermediateBitcoinWalletProvider', () => ({
  IntermediateBitcoinWalletProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-provider="intermediate-bitcoin-wallet">{children}</div>,
}));

vi.mock('../providers/ChainsProvider', () => ({
  ChainsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-provider="chains">{children}</div>
  ),
}));

describe('AppProviders', () => {
  it('nests providers in dependency order', () => {
    render(
      <AppProviders>
        <div data-testid="probe" />
      </AppProviders>,
    );

    const probe = screen.getByTestId('probe');
    const chains = probe.parentElement;
    const intermediateWallet = chains?.parentElement;
    const swapper = intermediateWallet?.parentElement;
    const router = swapper?.parentElement;

    expect(chains?.getAttribute('data-provider')).toBe('chains');
    expect(intermediateWallet?.getAttribute('data-provider')).toBe(
      'intermediate-bitcoin-wallet',
    );
    expect(swapper?.getAttribute('data-provider')).toBe('swapper');
    expect(router?.getAttribute('data-provider')).toBe('router');
  });
});
