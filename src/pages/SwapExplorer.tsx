import * as React from 'react';
import { Badge, Button, Card, Col, Placeholder, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput, { ValidatedInputRef } from '../components/ValidatedInput';
import { ChainSwapType } from '@atomiqlabs/sdk';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps, ExplorerSwapData } from '../adapters/transactionAdapters';

const timeframes = ['24h', '7d', '30d'];

export function SwapExplorer() {
  const refreshTable = useRef<() => void>(null);

  const [displayTimeframeIndex, setDisplayTimeframeIndex] = useState<number>(0);
  const changeTimeframe = () =>
    setDisplayTimeframeIndex((prevState) => (prevState + 1) % timeframes.length);
  const displayTimeframe = timeframes[displayTimeframeIndex];
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
      <Row>
        <Col xs={12} md={6} className="pb-3">
          <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
            <span className="">Total swaps</span>
            <div className={'flex-row align-items-baseline' + (statsLoading ? '' : ' d-flex')}>
              {statsLoading ? (
                <h3>
                  <Placeholder xs={6} />
                </h3>
              ) : (
                <>
                  <h3 className="">{stats?.totalSwapCount}</h3>
                  <h6
                    className="ms-1 text-success d-flex flex-row align-items-center cursor-pointer"
                    onClick={changeTimeframe}
                  >
                    <span>+{stats?.timeframes?.[displayTimeframe]?.count}</span>
                    <Badge className="font-smallest ms-1 text-dark" bg="light">
                      {displayTimeframe}
                    </Badge>
                  </h6>
                </>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6} className="pb-3">
          <Card className="px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0">
            <span>Total volume</span>
            <div className={'flex-row align-items-baseline' + (statsLoading ? '' : ' d-flex')}>
              {statsLoading ? (
                <h3>
                  <Placeholder xs={6} />
                </h3>
              ) : (
                <>
                  <h3 className="">
                    {stats?.totalUsdVolume == null
                      ? null
                      : FEConstants.USDollar.format(stats.totalUsdVolume)}
                  </h3>
                  <h6
                    className="ms-1 text-success d-flex flex-row align-items-center cursor-pointer"
                    onClick={changeTimeframe}
                  >
                    <span>
                      +
                      {stats?.timeframes?.[displayTimeframe]?.volumeUsd == null
                        ? null
                        : FEConstants.USDollar.format(
                            stats?.timeframes?.[displayTimeframe]?.volumeUsd
                          )}
                    </span>
                    <Badge className="font-smallest ms-1 text-dark" bg="light">
                      {displayTimeframe}
                    </Badge>
                  </h6>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <h1 className="page-title">Explorer</h1>

      <div className="d-flex flex-row mb-3">
        <ValidatedInput
          className="width-300px"
          type={'text'}
          placeholder={'Search by tx ID or wallet address'}
          inputRef={searchRef}
        />
        <Button
          className="ms-2"
          onClick={() => {
            const val = searchRef.current.getValue();
            if (val === '') {
              setSearch(null);
            } else {
              setSearch(val);
            }
          }}
        >
          Search
        </Button>
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
