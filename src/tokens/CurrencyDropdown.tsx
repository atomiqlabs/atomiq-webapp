import { Dropdown, Nav } from 'react-bootstrap';
import * as React from 'react';
import { isBtcToken, isSCToken, Token } from '@atomiqlabs/sdk';
import { TokenIcon } from './TokenIcon';
import { useEffect, useMemo, useState } from 'react';
import { capitalizeFirstLetter } from '../utils/Utils';
import { toTokenIdentifier } from './Tokens';

function CurrenciesEntry(props: { currencies: Token[]; onSelect: (currency: Token) => void }) {
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
                {curr.name}
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
          <CurrenciesEntry
            currencies={currenciesByChainId[chainId]}
            onSelect={(val) => {
              setShow(false);
              props.onSelect(val);
            }}
          />
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
