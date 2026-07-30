import {renderHook, waitFor} from '@testing-library/react';
import {
  BitcoinTokens,
  Fee,
  FeeType,
  FromBTCSwap,
  ISwap,
  SpvFromBTCSwap,
  TokenAmount,
} from '@atomiqlabs/sdk';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useWallet} from '../../wallets/useWallet';
import {useSwapFees} from '../useSwapFees';

vi.mock('../../wallets/useWallet', () => ({
  useWallet: vi.fn(),
}));

function tokenAmount(amount: string): TokenAmount {
  return {
    rawAmount: BigInt(amount),
    amount,
    _amount: Number(amount),
    token: BitcoinTokens.BTC,
    currentUsdValue: () => Promise.resolve(Number(amount)),
    usdValue: () => Promise.resolve(Number(amount)),
    toString: () => `${amount} BTC`,
    isUnknown: false,
  };
}

function fee(amount: string): Fee {
  const value = tokenAmount(amount);
  return {
    amountInSrcToken: value,
    amountInDstToken: null,
    currentUsdValue: value.currentUsdValue,
    usdValue: value.usdValue,
  };
}

function spvSwap(
  breakdown: Array<{type: FeeType; fee: Fee}>,
  estimateBitcoinFee = vi.fn(() => Promise.resolve(tokenAmount('3')))
): SpvFromBTCSwap<any> {
  return Object.assign(Object.create(SpvFromBTCSwap.prototype), {
    getSwapMode: () => 'intermediate_wallet',
    getFeeBreakdown: () => breakdown,
    estimateBitcoinFee,
  });
}

describe('useSwapFees', () => {
  beforeEach(() => {
    vi.mocked(useWallet).mockReturnValue({
      instance: {id: 'extension-wallet'},
    } as any);
  });

  it('maps the SDK Bitcoin input-network fee without estimating it twice', async () => {
    const estimateBitcoinFee = vi.fn(() => Promise.resolve(tokenAmount('3')));
    const swap = spvSwap(
      [
        {type: FeeType.NETWORK_INPUT, fee: fee('1')},
        {type: FeeType.SWAP, fee: fee('2')},
      ],
      estimateBitcoinFee
    );

    const {result} = renderHook(() => useSwapFees(swap, 5));

    await waitFor(() => expect(result.current.fees).toHaveLength(2));
    expect(result.current.fees[0]).toMatchObject({
      text: 'Bitcoin network fee',
      description: 'Transaction fees on the input network',
    });
    expect(estimateBitcoinFee).not.toHaveBeenCalled();
  });

  it('still estimates the input fee for a PSBT-mode SPV quote', async () => {
    const estimateBitcoinFee = vi.fn(() => Promise.resolve(tokenAmount('3')));
    const swap = spvSwap([{type: FeeType.SWAP, fee: fee('2')}], estimateBitcoinFee);
    Object.assign(swap, {getSwapMode: () => 'psbt'});

    const {result} = renderHook(() => useSwapFees(swap, 5));

    await waitFor(() =>
      expect(result.current.fees.some((value) => value.text === 'Bitcoin network fee')).toBe(true)
    );
    expect(estimateBitcoinFee).toHaveBeenCalledWith({id: 'extension-wallet'}, 5);
  });

  it('keeps classic FromBTC watchtower and estimated network fees', async () => {
    const estimateBitcoinFee = vi.fn(() => Promise.resolve(tokenAmount('3')));
    const swap = Object.assign(Object.create(FromBTCSwap.prototype), {
      getFeeBreakdown: () => [{type: FeeType.SWAP, fee: fee('2')}],
      getClaimerBounty: () => tokenAmount('1'),
      estimateBitcoinFee,
    }) as FromBTCSwap<any>;

    const {result} = renderHook(() => useSwapFees(swap, 5));

    await waitFor(() => expect(result.current.fees).toHaveLength(3));
    expect(result.current.fees.map((value) => value.text)).toEqual([
      'Bitcoin network fee',
      'Swap fee',
      'Watchtower fee',
    ]);
    expect(estimateBitcoinFee).toHaveBeenCalledOnce();
  });

  it('keeps generic non-SPV swap fees unchanged', () => {
    const swap = {
      getFeeBreakdown: () => [{type: FeeType.SWAP, fee: fee('2')}],
    } as unknown as ISwap;

    const {result} = renderHook(() => useSwapFees(swap, undefined, false));

    expect(result.current.fees.map((value) => value.text)).toEqual(['Swap fee']);
  });

  it('filters unsupported SDK breakdown rows', () => {
    const swap = {
      getFeeBreakdown: () => [{type: 999, fee: fee('1')}],
    } as unknown as ISwap;

    const {result} = renderHook(() => useSwapFees(swap, undefined, false));

    expect(result.current.fees).toEqual([]);
  });
});
