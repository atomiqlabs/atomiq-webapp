import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAsync } from '../useAsync';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAsync', () => {
  it('logs caught errors by default and exposes the error state', async () => {
    const error = new Error('expected failure');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw error;
      }, []),
    );

    await act(async () => {
      await result.current[0]();
    });

    expect(consoleError).toHaveBeenCalledWith('useAsync(): ', error);
    expect(result.current[1]).toBe(false);
    expect(result.current[3]).toBe(error);
  });

  it('suppresses logging through the third positional argument', async () => {
    const error = new Error('private failure');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useAsync(
        async () => {
          throw error;
        },
        [],
        true,
      ),
    );

    await act(async () => {
      await result.current[0]();
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(result.current[1]).toBe(false);
    expect(result.current[3]).toBe(error);
  });

  it('keeps the duplicate-execution guard and success state when logging is suppressed', async () => {
    let resolveAction: (value: string) => void;
    const pendingAction = new Promise<string>((resolve) => {
      resolveAction = resolve;
    });
    const executor = vi.fn().mockReturnValue(pendingAction);
    const { result } = renderHook(() =>
      useAsync<[], string>(executor, [], true),
    );

    let firstAction: Promise<string>;
    let duplicateResult: string;
    await act(async () => {
      firstAction = result.current[0]();
      duplicateResult = await result.current[0]();
    });

    expect(executor).toHaveBeenCalledTimes(1);
    expect(duplicateResult).toBeNull();
    expect(result.current[1]).toBe(true);

    await act(async () => {
      resolveAction('done');
      await firstAction;
    });

    expect(result.current[1]).toBe(false);
    expect(result.current[2]).toBe('done');
    expect(result.current[3]).toBeNull();
  });

  it('uses the latest positional suppression argument after rerender', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, rerender } = renderHook(
      ({ suppress }) =>
        useAsync(
          async () => {
            throw new Error('failure');
          },
          [],
          suppress,
        ),
      { initialProps: { suppress: false } },
    );

    await act(async () => {
      await result.current[0]();
    });
    expect(consoleError).toHaveBeenCalledTimes(1);

    rerender({ suppress: true });
    await waitFor(() => expect(result.current[1]).toBe(false));
    await act(async () => {
      await result.current[0]();
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('clears retained success and error state', async () => {
    const error = new Error('expected failure');
    const { result, rerender } = renderHook(
      ({ shouldFail }) =>
        useAsync(
          async () => {
            if (shouldFail) throw error;
            return 'done';
          },
          [shouldFail],
          true,
        ),
      { initialProps: { shouldFail: false } },
    );

    await act(async () => {
      await result.current[0]();
    });
    expect(result.current[2]).toBe('done');

    act(() => result.current[4]());
    expect(result.current[2]).toBeNull();
    expect(result.current[3]).toBeNull();

    rerender({ shouldFail: true });
    await act(async () => {
      await result.current[0]();
    });
    expect(result.current[3]).toBe(error);

    act(() => result.current[4]());
    expect(result.current[2]).toBeNull();
    expect(result.current[3]).toBeNull();
  });
});
