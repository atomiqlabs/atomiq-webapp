import * as React from 'react';
import { Col, Dropdown, Form, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput, { ValidatedInputRef } from '../components/ValidatedInput';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps, ExplorerSwapData } from '../adapters/transactionAdapters';
import { ExplorerTotals } from '../components/explorer/ExplorerTotals';
import { BaseButton } from '../components/common/BaseButton';
import {ChainsContext} from "../context/ChainsContext";
import {Chain} from "../providers/ChainsProvider";
import {smartChainTokenArray, TokenIcons} from "../utils/Tokens";

const tokenTickers = Array.from(new Set(smartChainTokenArray.map(val => val.ticker)));

export function SwapExplorer() {
  const {chains} = useContext(ChainsContext);

  const refreshTable = useRef<() => void>(null);

  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [showChainDropdown, setShowChainDropdown] = useState<boolean>(false);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [showTokenDropdown, setShowTokenDropdown] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    totalSwapCount: number;
    totalUsdVolume: number;
    chainData: {
      [chain: string]: {
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

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    );
  };

  const toggleToken = (token: string) => {
    setSelectedTokens((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]
    );
  };

  const additionalData = useMemo(() => {
    const additionalData: any = {};
    if (search != null) additionalData.search = search;
    if (selectedChains.length > 0) additionalData.chain = selectedChains;
    if (selectedTokens.length > 0) additionalData.token = selectedTokens;
    return additionalData;
  }, [search, selectedChains, selectedTokens]);

  const chainBreakdownCountData = useMemo(() => {
    if (!stats?.chainData) return [];
    return Object.entries(stats.chainData).map(([chainId, data]: [string, any]) => ({
      name: chains[chainId]?.chain.name,
      icon: chains[chainId]?.chain.icon,
      value: data.count
    }));
  }, [stats]);

  const chainBreakdownVolumeData = useMemo(() => {
    if (!stats?.chainData) return [];
    return Object.entries(stats.chainData).map(([chainId, data]: [string, any]) => ({
      name: chains[chainId]?.chain.name,
      icon: chains[chainId]?.chain.icon,
      value: data.volumeUsd
    }));
  }, [stats]);

  return (
    <div className="container">
      <div className="explorer-totals-wrapper">
        <ExplorerTotals
          title="Total swaps"
          count={stats?.totalSwapCount}
          getDifference={(timeframe) => stats?.timeframes?.[timeframe]?.count}
          loading={statsLoading}
          breakdownData={chainBreakdownCountData}
        />
        <ExplorerTotals
          title="Total volume"
          shortenOnMobile={true}
          isUsd={true}
          count={stats?.totalUsdVolume}
          getDifference={(timeframe) => stats?.timeframes?.[timeframe]?.volumeUsd}
          loading={statsLoading}
          breakdownData={chainBreakdownVolumeData}
        />
      </div>

      <h1 className="page-title">Explorer</h1>

      <div className="explorer-filter">
        <div className="explorer-filter__buttons">
          {/* CHAIN FILTER */}
          <Dropdown
            show={showChainDropdown}
            onToggle={(val) => setShowChainDropdown(val)}
            autoClose="outside"
          >
            <Dropdown.Toggle id="chain-filter-dropdown">
              {selectedChains.length > 0 ? (
                <>
                  <span className="sc-count">{selectedChains.length}</span>
                  Chains
                </>
              ) : (
                'All Chains'
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {Object.keys(chains).map((chainId) => {
                const {chain} = chains[chainId] as Chain<any>;
                return (
                  <Dropdown.Item
                    key={chainId}
                    as="div"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleChain(chainId);
                    }}
                  >
                    <Form.Check
                      type="checkbox"
                      id={`chain-${chainId}`}
                      label={
                        <>
                          {chain.icon && <img src={chain.icon} alt={chain.name} className="chain-icon" />}
                          {chain.name}
                        </>
                      }
                      checked={selectedChains.includes(chainId)}
                      onChange={() => toggleChain(chainId)}
                    />
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>

          {/* TOKEN FILTER */}
          <Dropdown
            show={showTokenDropdown}
            onToggle={(val) => setShowTokenDropdown(val)}
            autoClose="outside"
          >
            <Dropdown.Toggle id="token-filter-dropdown">
              {selectedTokens.length > 0 ? (
                <>
                  <span className="sc-count">{selectedTokens.length}</span>
                  Tokens
                  <span
                    className="clear-filter icon icon-circle-x-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTokens([]);
                    }}
                  ></span>
                </>
              ) : (
                'All Tokens'
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {tokenTickers.map((token) => {
                const icon = TokenIcons[token];
                return (
                  <Dropdown.Item
                    key={token}
                    as="div"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleToken(token);
                    }}
                  >
                    <Form.Check
                      type="checkbox"
                      id={`token-${token}`}
                      label={
                        <>
                          {icon && <img src={icon} alt={token} className="chain-icon" />}
                          {token}
                        </>
                      }
                      checked={selectedTokens.includes(token)}
                      onChange={() => toggleToken(token)}
                    />
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>
          {(showChainDropdown || showTokenDropdown) && (
            <div
              className="explorer-filter__overlay"
              onClick={() => {
                setShowChainDropdown(false);
                setShowTokenDropdown(false);
              }}
            />
          )}
          {(selectedChains.length > 0 || selectedTokens.length > 0 || search != null) && (
            <div
              className="explorer-filter__clear"
              onClick={() => {
                setSelectedChains([]);
                setSelectedTokens([]);
                setSearch(null);
                if (searchRef.current) {
                  searchRef.current.setValue('');
                }
              }}
            >
              Clear All
            </div>
          )}
        </div>
        {/* SEARCH FILTER */}
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
