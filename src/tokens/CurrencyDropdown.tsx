import { Dropdown, Nav } from 'react-bootstrap';
import * as React from 'react';
import { isBtcToken, isSCToken, Token } from '@atomiqlabs/sdk';
import { TokenIcon } from './TokenIcon';
import { useEffect, useMemo, useState } from 'react';
import { capitalizeFirstLetter } from '../utils/Utils';
import { toTokenIdentifier } from './Tokens';

function CurrenciesEntry(props: { currencies: Token[]; onSelect: (currency: Token) => void }) {
  console.log(props.currencies);
  return (
    <>
      {props.currencies != null
        ? props.currencies.map((curr) => {
            return (
              <Dropdown.Item
                key={toTokenIdentifier(curr)}
                onClick={() => {
                  props.onSelect(curr);
                }}
              >
                <TokenIcon tokenOrTicker={curr} className="currency-icon" />
                <div className="sc-ticker">{curr.ticker}</div>
                <div className="sc-name">{curr.name}</div>
              </Dropdown.Item>
            );
          })
        : ''}
    </>
  );
}

export function CurrencyDropdown(props: {
  currencyList: Token[];
  onSelect: (currency: Token) => void;
  value: Token;
  className?: string;
}) {
  //Group by chainId
  const { currenciesByChainId, chains } = useMemo(() => {
    const currenciesByChainId = {};
    if (props.currencyList != null)
      props.currencyList.forEach((currency) => {
        const chainId = isSCToken(currency) ? currency.chainId : 'BITCOIN';
        currenciesByChainId[chainId] ??= [];
        currenciesByChainId[chainId].push(currency);
      });
    const chains = Object.keys(currenciesByChainId);
    return { currenciesByChainId, chains };
  }, [props.currencyList]);

  const [_chainId, setChainId] = useState<string>();
  const chainId = currenciesByChainId[_chainId] != null ? _chainId : chains?.[0];

  useEffect(() => {
    if (props.value != null) setChainId(isSCToken(props.value) ? props.value.chainId : 'BITCOIN');
  }, [props.value]);

  const [show, setShow] = useState<boolean>();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayedCurrencies = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) {
      return chainId && currenciesByChainId[chainId] ? currenciesByChainId[chainId] : [];
    }
    const list = props.currencyList ?? [];
    return list.filter((c) => {
      const t = (c as any).ticker ? String((c as any).ticker).toLowerCase() : '';
      const n = (c as any).name ? String((c as any).name).toLowerCase() : '';
      return t.includes(q) || n.includes(q);
    });
  }, [searchQuery, chainId, currenciesByChainId, props.currencyList]);

  let currencyChainId: string;
  if (props.value != null) {
    if (isSCToken(props.value)) currencyChainId = props.value.chainId;
    if (isBtcToken(props.value)) currencyChainId = props.value.lightning ? 'LIGHTNING' : 'BITCOIN';
  }

  return (
    <Dropdown
      show={show}
      onToggle={(val) => setShow(val)}
      autoClose="outside"
      className="currency-dropdown"
    >
      <Dropdown.Toggle
        id="dropdown-basic"
        className={'currency-dropdown__toggle ' + props.className}
      >
        <div className="currency-dropdown__token">
          {props.value == null ? (
            ''
          ) : (
            <TokenIcon tokenOrTicker={props.value} className="currency-dropdown__token__img" />
          )}
          <img
            src={'/icons/chains/' + currencyChainId + '.svg'}
            className="currency-dropdown__token__currency"
          />
        </div>
        <div className="currency-dropdown__details">
          <div className="currency-dropdown__currency">
            {props.value == null ? 'Select currency' : props.value.ticker}
          </div>
          <div className="currency-dropdown__second">
            on {currencyChainId != null ? capitalizeFirstLetter(currencyChainId) : ''}
          </div>
        </div>
        <div className="currency-dropdown__dropdown icon icon-dropdown"></div>
      </Dropdown.Toggle>
      {show && <div className="currency-dropdown__overlay" onClick={() => setShow(false)} />}

      <Dropdown.Menu>
        <Nav style={{ maxWidth: '80vw' }} activeKey={chainId} onSelect={(val) => setChainId(val)}>
          {chains.map((val) => {
            return (
              <Nav.Item key={val}>
                <Nav.Link eventKey={val} className="currency-dropdown__nav-link">
                  <img src={'/icons/chains/' + val + '.svg'} className="currency-icon-medium" />
                </Nav.Link>
              </Nav.Item>
            );
          })}
        </Nav>
        <div className="currency-dropdown__items">
          <div className="currency-dropdown__search">
            <input
              type="text"
              className="currency-dropdown__search__input form-control"
              placeholder="Search tokens..."
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="icon icon-search"></div>
          </div>
          <CurrenciesEntry
            currencies={displayedCurrencies}
            onSelect={(val) => {
              setShow(false);
              if(props.onSelect) props.onSelect(val);
            }}
          />
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
