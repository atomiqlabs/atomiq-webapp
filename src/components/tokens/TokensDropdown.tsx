import { Dropdown, Nav } from 'react-bootstrap';
import * as React from 'react';
import { isSCToken, Token } from '@atomiqlabs/sdk';
import { TokenIcon } from './TokenIcon';
import { useEffect, useMemo, useState } from 'react';
import { toTokenIdentifier } from '../../utils/Tokens';
import {useChain} from "../../hooks/chains/useChain";

export function TokensDropdown(props: {
  tokensList: Token[];
  onSelect: (currency: Token) => void;
  value: Token;
  className?: string;
}) {
  //Group by chainId
  const { tokensByChainId, chains } = useMemo(() => {
    const tokensByChainId = {};
    if (props.tokensList != null)
      props.tokensList.forEach((token) => {
        const chainId = isSCToken(token) ? token.chainId : 'BITCOIN';
        tokensByChainId[chainId] ??= [];
        tokensByChainId[chainId].push(token);
      });
    const chains = Object.keys(tokensByChainId);
    return { tokensByChainId, chains };
  }, [props.tokensList]);

  const [_chainId, setChainId] = useState<string>();
  const chainId = tokensByChainId[_chainId] != null ? _chainId : chains?.[0];

  useEffect(() => {
    if (props.value != null) setChainId(isSCToken(props.value) ? props.value.chainId : 'BITCOIN');
  }, [props.value]);

  const [show, setShow] = useState<boolean>();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayedTokens = useMemo<Token[]>(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) {
      return chainId && tokensByChainId[chainId] ? tokensByChainId[chainId] : [];
    }
    const list = props.tokensList ?? [];
    return list.filter((c) => {
      const t = (c as any).ticker ? String((c as any).ticker).toLowerCase() : '';
      const n = (c as any).name ? String((c as any).name).toLowerCase() : '';
      return t.includes(q) || n.includes(q);
    });
  }, [searchQuery, chainId, tokensByChainId, props.tokensList]);

  const tokenChain = useChain(props.value);

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
            src={tokenChain?.chain.icon}
            className="currency-dropdown__token__currency"
          />
        </div>
        <div className="currency-dropdown__details">
          <div className="currency-dropdown__currency">
            {props.value == null ? 'Select currency' : props.value.ticker}
          </div>
          <div className="currency-dropdown__second">
            on {tokenChain?.chain.name ?? ''}
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
          {!!displayedTokens && displayedTokens.map(token => (
            <Dropdown.Item
              key={toTokenIdentifier(token)}
              onClick={() => {
                props.onSelect(token);
              }}
            >
              <TokenIcon tokenOrTicker={token} className="currency-icon" />
              <div className="sc-ticker">{token.ticker}</div>
              <div className="sc-name">{token.name}</div>
            </Dropdown.Item>
          ))}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}
