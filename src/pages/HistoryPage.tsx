import { ISwap, SwapType } from '@atomiqlabs/sdk';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../context/SwapperContext';
import { TransactionsTable } from '../components/table/TransactionsTable';
import {Spinner} from "react-bootstrap";
import Icon from "react-icons-kit";
import { ic_warning } from 'react-icons-kit/md/ic_warning';

const SHOW_FILTER = false; // TODO implement filter and uncomment this to display it

export function HistoryPage() {
  const { swapper, syncingError, syncing } = useContext(SwapperContext);

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
    };
  }, [swapper]);

  return (
    <div className="history-page">
      <div className="container">
        {/* TITLE */}
        <h1 className="page-title">Your Swap History</h1>
        {syncing && <div className="history-page__subtitle">
          <Spinner className="text-white me-2" size="sm" />
          <span className="text-start">Syncing previous swaps...</span>
        </div>}
        {syncingError && <div className="history-page__subtitle">
          <Icon size={20} className="me-2 flex" icon={ic_warning} />
          <span className="text-start">Failed to synchronize previous swaps, reload the webpage to re-attempt.</span>
        </div>}

        {/* FILTER */}
        {SHOW_FILTER && (
          <div className="history-page__filter">
            <div className="history-page__filter__title">Filter by chain:</div>
            <div className="history-page__filter__items">
              <button className="sc-item is-selected">
                <img src={'/icons/chains/solana.svg'} alt="solana" />
                Solana
              </button>
              <button className="sc-item">
                <img src={'/icons/chains/bitcoin.svg'} alt="bitcoin" />
                Bitcoin
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}
        <TransactionsTable data={swaps} itemsPerPage={20} />
      </div>
    </div>
  );
}
