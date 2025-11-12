import { ISwap, SwapType } from '@atomiqlabs/sdk';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../context/SwapperContext';
import { HistoryEntry } from '../components/history/HistoryEntry';
import {ArrayDataPaginatedList} from "../components/list/ArrayDataPaginatedList";

export function History() {
  const { swapper } = useContext(SwapperContext);

  const [swaps, setSwaps] = useState<ISwap[]>([]);

  useEffect(() => {
    if (swapper == null) return;
    swapper.getAllSwaps().then((swaps) => {
      setSwaps(
        swaps
          .filter(
            (swap) =>
              swap.isInitiated() &&
              swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
              swap.getType() !== SwapType.TRUSTED_FROM_BTCLN
          )
          .sort((a, b) => {
            const _a = a.requiresAction();
            const _b = b.requiresAction();
            if (_a === _b) return b.createdAt - a.createdAt;
            if (_a) return -1;
            if (_b) return 1;
          })
      );
    });

    const listener = (swap: ISwap) => {
      if (!swap.isInitiated()) return;
      if (
        swap.getType() === SwapType.TRUSTED_FROM_BTC ||
        swap.getType() === SwapType.TRUSTED_FROM_BTCLN
      )
        return;
      setSwaps((swaps) => {
        if (swaps.includes(swap)) return [...swaps];
        return [swap, ...swaps];
      });
    };
    swapper.on('swapState', listener);

    return () => {
      swapper.off('swapState', listener);
      setSwaps([]);
      console.log('History: Set swaps to []');
    };
  }, [swapper]);

  return (
    <>
      <div className="flex-fill text-white container text-start">
        <ArrayDataPaginatedList<ISwap>
          renderer={(row) => {
            return <HistoryEntry swap={row} />;
          }}
          data={swaps}
          itemsPerPage={10}
        />
      </div>
    </>
  );
}
