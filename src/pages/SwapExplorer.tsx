import * as React from 'react';
import { Badge, Button, Card, Col, Placeholder, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput, { ValidatedInputRef } from '../components/ValidatedInput';
import { ChainSwapType } from '@atomiqlabs/sdk';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps, ExplorerSwapData } from '../adapters/transactionAdapters';
import { ExplorerTotals } from '../components/explorer/ExplorerTotals';
import { BaseButton } from '../components/common/BaseButton';

export function SwapExplorer() {
  const refreshTable = useRef<() => void>(null);

  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    totalSwapCount: number;
    totalUsdVolume: number;
    currencyData: {
      [currency in 'USDC' | 'SOL']: {
        count: number;
        volume: number;
        volumeUsd: number;
      };
    };
    timeframes: {
      [timeframe in '24h' | '7d' | '30d']: {
        count: number;
        volume: number;
        volumeUsd: number;
      };
    };
  }>(null);

  const [search, setSearch] = useState<string>();
  const searchRef = useRef<ValidatedInputRef>();

  useEffect(() => {
    const abortController = new AbortController();

    setStatsLoading(true);
    fetch(FEConstants.statsUrl + '/GetStats', {
      signal: abortController.signal,
    })
      .then((resp) => {
        return resp.json();
      })
      .then((obj) => {
        setStats(obj);
        setStatsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setStatsLoading(false);
      });

    return () => abortController.abort();
  }, []);

  const additionalData = useMemo(() => {
    const additionalData: any = {};
    if (search != null) additionalData.search = search;
    return additionalData;
  }, [search]);

  return (
    <div className="container">
      <div className="explorer-totals-wrapper">
        <ExplorerTotals
          title="Total swaps"
          count={stats?.totalSwapCount}
          getDifference={(timeframe) => stats?.timeframes?.[timeframe]?.count}
          loading={statsLoading}
        />
        <ExplorerTotals
          title="Total volume"
          count={
            stats?.totalUsdVolume == null ? null : FEConstants.USDollar.format(stats.totalUsdVolume)
          }
          getDifference={(timeframe) =>
            stats?.timeframes?.[timeframe]?.volumeUsd == null
              ? null
              : FEConstants.USDollar.format(stats?.timeframes?.[timeframe]?.volumeUsd)
          }
          loading={statsLoading}
        />
      </div>

      <h1 className="page-title">Explorer</h1>

      <div className="explorer-filter">
        <div className="explorer-filter__buttons">TODO</div>
        <div className="explorer-filter__search">
          <ValidatedInput
            type={'text'}
            placeholder={'Search by tx ID or wallet address'}
            inputRef={searchRef}
            onSubmit={() => {
              const val = searchRef.current.getValue();
              if (val === '') {
                setSearch(null);
              } else {
                setSearch(val);
              }
            }}
          />
          <BaseButton
            variant="primary"
            customIcon="search"
            textSize="sm"
            onClick={() => {
              const val = searchRef.current.getValue();
              if (val === '') {
                setSearch(null);
              } else {
                setSearch(val);
              }
            }}
          ></BaseButton>
        </div>
      </div>

      <div className="transactions-table">
        <div className="transactions-table__head">
          <Row className="transaction-entry gx-1 gy-1">
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
            <Col md={2} sm={12} className="d-flex text-end flex-column is-status">
              Status
            </Col>
          </Row>
        </div>
        <BackendDataPaginatedList<ExplorerSwapData>
          renderer={(row) => <TransactionEntry {...explorerSwapToProps(row)} />}
          endpoint={FEConstants.statsUrl + '/GetSwapList'}
          itemsPerPage={10}
          refreshFunc={refreshTable}
          additionalData={additionalData}
        />
      </div>
    </div>
  );
}
