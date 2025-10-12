import { useContext, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ChainDataContext } from './context/ChainDataContext';
import { ChainWalletData } from './ChainDataProvider';
import { BaseButton } from '../components/BaseButton';
import { ConnectedWalletAnchor } from './ConnectedWalletAnchor';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { smartChainTokenArray } from '../tokens/Tokens';
import { Tokens } from '../FEConstants';

type MultichainWallet = {
  name: string;
  icon: string;
  chains: {
    [chain: string]: {
      name: string;
      icon: string;
      chainId: string;
    };
  };
};

type WalletConnection = {
  name: string;
  code: string;
  icon: string;
  token: any;
};

function MultichainWalletDisplay(props: { wallet: MultichainWallet; className?: string }) {
  const chainWalletData = useContext(ChainDataContext);
  const chains = Object.keys(props.wallet.chains).map((chain) => props.wallet.chains[chain]);

  const [show, setShow] = useState<boolean>(false);

  return (
    <Dropdown align="end" show={show} onToggle={(isOpen) => setShow(isOpen)}>
      <div
        className="wallet-connections__trigger"
        onClick={() => setShow((s) => !s)}
        aria-expanded={show}
        role="button"
      >
        <div className="wallet-connections__badge">
          <Badge
            id={'dropdown' + props.wallet.name}
            className="p-0 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row"
          >
            <img width={24} height={24} src={props.wallet.icon} />
            {chains.map((value) => {
              return (
                <img className="mx-1" width={18} height={18} key={value.name} src={value.icon} />
              );
            })}
          </Badge>
        </div>
        <div className="icon icon-dropdown"></div>
      </div>

      <Dropdown.Menu
        popperConfig={{ strategy: 'absolute' }}
        className={'wallet-connections__dropdown'}
      >
        {chains.map((value) => {
          return (
            <>
              <Dropdown.Header>
                <div className="sc-title">{props.wallet.name}</div>
                <div className="sc-subtitle">
                  <img width={24} height={24} src={value.icon} className="sc-icon" />
                  <div className="sc-text">{value.name}</div>
                  {/*  TODO add copy address*/}
                </div>
              </Dropdown.Header>
              <div className="dropdown-list">
                <Dropdown.Item onClick={() => chainWalletData.disconnectWallet(value.chainId)}>
                  <div className="icon icon-disconnect"></div>
                  Disconnect Wallet
                </Dropdown.Item>
                <Dropdown.Item onClick={() => chainWalletData.changeWallet(value.chainId)}>
                  <div className="icon icon-change-wallet"></div>
                  Change Wallet
                </Dropdown.Item>
              </div>
            </>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export function WalletConnections() {
  const {chains} = useContext(ChainDataContext);

  const connectedWallets: {
    [walletName: string]: MultichainWallet;
  } = {};
  for (let chain in chains) {
    const chainData: ChainWalletData<any> = chains[chain];
    if (chainData.wallet == null) continue;
    connectedWallets[chainData.wallet.name] ??= {
      name: chainData.wallet.name,
      icon: chainData.wallet.icon,
      chains: {},
    };
    connectedWallets[chainData.wallet.name].chains[chain] = {
      name: chainData.chain.name,
      icon: chainData.chain.icon,
      chainId: chain
    };
  }

  const walletsArr: MultichainWallet[] = Object.keys(connectedWallets).map(
    (key) => connectedWallets[key]
  );
  // <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title}/>
  const [solanaToken, setSolanaToken] = useStateWithOverride(smartChainTokenArray[0], null);
  const [bitcoinToken, setBitcoinToken] = useStateWithOverride(Tokens.BITCOIN.BTC, null);

  const connections: WalletConnection[] = [
    {
      name: 'Solana',
      code: 'solana',
      icon: '/icons/chains/solana.svg',
      token: solanaToken,
    },
    {
      name: 'Bitcoin',
      code: 'bitcoin',
      icon: '/icons/chains/bitcoin.svg',
      token: bitcoinToken,
    },
  ];

  return (
    <div className="wallet-connections">
      {walletsArr &&
        walletsArr.map((value) => <MultichainWalletDisplay key={value.name} wallet={value} />)}

      {walletsArr.length < 2 ? (
        <Dropdown align="end">
          {walletsArr.length == 0 ? (
            <Dropdown.Toggle
              as={BaseButton}
              className="wallet-connections__button is-main is-full"
              variant="transparent"
              customIcon="connect"
              bsPrefix="none"
            >
              Connect Walletisko
            </Dropdown.Toggle>
          ) : (
            <Dropdown.Toggle
              as={BaseButton}
              className="wallet-connections__button"
              variant="clear"
              customIcon="connect"
              bsPrefix="none"
            ></Dropdown.Toggle>
          )}
          <Dropdown.Menu className="wallet-connections__dropdown">
            {connections.map((value) => (
              <div key={value.code} className="wallet-connections__item">
                <div className="wallet-connections__item__header">
                  <img src={value.icon} alt={value.name} width={24} height={24} />
                  <span className="wallet-connections__item__header__name">{value.name}</span>
                </div>
                <ConnectedWalletAnchor noText={false} currency={value.token} />
              </div>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      ) : null}
    </div>
  );
}
