import {describe, expect, it, vi} from 'vitest';
import {choseAmountWithPrecedence} from '../useSwapPage';

vi.mock('../../quoting/useQuote', () => ({
  useQuote: vi.fn(),
}));

describe('choseAmountWithPrecedence', () => {
  it('uses the quote amount when the typed amount differs', () => {
    expect(choseAmountWithPrecedence('1.1', '1.25')).toBe('1.1');
  });

  it('preserves the typed representation when the amounts are numerically equal', () => {
    expect(choseAmountWithPrecedence('1.1', '1.100')).toBe('1.100');
  });

  it('uses the quote amount when no typed amount applies', () => {
    expect(choseAmountWithPrecedence('1.1', undefined)).toBe('1.1');
  });
});
