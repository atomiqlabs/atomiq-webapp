import { ISwap, SwapType } from '@atomiqlabs/sdk';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../context/SwapperContext';
import { HistoryEntry } from '../components/history/HistoryEntry';
import { ArrayDataPaginatedList } from '../components/list/ArrayDataPaginatedList';
import { Col, Row } from 'react-bootstrap';

const SHOW_FILTER = false;

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
    <div className="history-page">
      <div className="container">
        <div className="history-page__title">
          <h2>Your Swap History</h2>
        </div>
        {/* Hidden until filter will be implemented */}
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
        <div className="history-table">
          <div className="history-table__head">
            <Row className="history-entry gx-1 gy-1">
              <Col md={4} sm={12} className="is-token">
                From
              </Col>
              <Col md={3} sm={12} className="is-token">
                To
              </Col>
              <Col md={1} sm={12} className="is-value is-right">
                Value
              </Col>
              <Col md={2} sm={12} className="d-flex text-end flex-column is-date is-right">
                Date
              </Col>
              <Col md={1} sm={12} className="d-flex text-end flex-column is-status">
                Status
              </Col>
            </Row>
          </div>
          <ArrayDataPaginatedList<ISwap>
            renderer={(row) => {
              return <HistoryEntry swap={row} />;
            }}
            data={swaps}
            itemsPerPage={100}
          />
        </div>
      </div>
    </div>
  );
}
