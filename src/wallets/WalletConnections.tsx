import { useContext, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ChainDataContext } from './context/ChainDataContext';
import { ChainWalletData } from './ChainDataProvider';
import { BaseButton } from '../components/BaseButton';
import Icon from 'react-icons-kit';
import { close } from 'react-icons-kit/fa/close';
import { ConnectedWalletAnchor } from './ConnectedWalletAnchor';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { smartChainTokenArray } from '../tokens/Tokens';
import { Tokens } from '../FEConstants';

type MultichainWallet = {
  name: string;
  icon: string;
  chains: {
    [chain: string]: {
      disconnect: () => Promise<void> | void;
      changeWallet: () => Promise<void> | void;
      name: string;
      icon: string;
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
  const chains = Object.keys(props.wallet.chains).map((chain) => props.wallet.chains[chain]);

  const [show, setShow] = useState<boolean>(false);

  return (
    <Dropdown align="end" show={show} onToggle={(nextShow) => setShow(nextShow)}>
      <div className="wallet-connections__badge" onClick={() => setShow(true)}>
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
          {/*  TODO add chevron down */}
        </Badge>
      </div>

      <Dropdown.Menu popperConfig={{ strategy: 'absolute' }}>
        {chains.map((value) => {
          return (
            <>
              <Dropdown.Header>{value.name}</Dropdown.Header>
              <Dropdown.Item onClick={() => value.disconnect()}>Disconnect</Dropdown.Item>
              {value.changeWallet != null ? (
                <Dropdown.Item onClick={() => value.changeWallet()}>Change wallet</Dropdown.Item>
              ) : (
                ''
              )}
            </>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export function WalletConnections() {
  const chainWalletData = useContext(ChainDataContext);

  const connectedWallets: {
    [walletName: string]: MultichainWallet;
  } = {};
  for (let chain in chainWalletData) {
    const chainData: ChainWalletData<any> = chainWalletData[chain];
    if (chainData.wallet == null) continue;
    connectedWallets[chainData.wallet.name] ??= {
      name: chainData.wallet.name,
      icon: chainData.wallet.icon,
      chains: {},
    };
    connectedWallets[chainData.wallet.name].chains[chain] = {
      name: chainData.chain.name,
      icon: chainData.chain.icon,
      disconnect: chainData.disconnect,
      changeWallet: chainData.changeWallet,
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
      icon: '/icons/chains/solana_v2.svg',
      token: solanaToken,
    },
    {
      name: 'Bitcoin',
      code: 'bitcoin',
      icon: '/icons/chains/bitcoin_v2.svg',
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
              className="wallet-connectionst__button"
              variant="transparent"
              icon={<Icon size={20} icon={close} />}
              bsPrefix="none"
            >
              Connect Wallet
            </Dropdown.Toggle>
          ) : (
            <Dropdown.Toggle
              as={BaseButton}
              className="wallet-connectionst__button"
              variant="clear"
              icon={<Icon size={20} icon={close} />}
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
