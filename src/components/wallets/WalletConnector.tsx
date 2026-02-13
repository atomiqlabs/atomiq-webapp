import { useContext, useMemo, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ChainsContext } from '../../context/ChainsContext';
import { Chain } from '../../providers/ChainsProvider';
import { BaseButton } from '../common/BaseButton';

type MultichainWallet = {
  name: string;
  icon: string;
  chains: {
    [chain: string]: {
      name: string;
      icon: string;
      chainId: string;
      additionalWalletActions?: {icon: JSX.Element | string, text: string, onClick: () => void}[];
    };
  };
};

function MultichainWalletMenuItem(props: { wallet: MultichainWallet; className?: string }) {
  const { changeWallet, disconnectWallet } = useContext(ChainsContext);
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
            className="p-0 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row pe-1"
          >
            <img className="mr-0.5" width={24} height={24} src={props.wallet.icon} />
            {chains.map((value, i) => {
              return (
                <img className={i===0 ? "" : "-ml-1"} style={{zIndex: 10-i}} width={18} height={18} key={value.name} src={value.icon} />
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
        <Dropdown.Header>
          <div className="sc-title">{props.wallet.name}</div>
        </Dropdown.Header>
        {chains.map((value) => (
          <div key={value.chainId}>
            <Dropdown.Header>
              <div className="sc-subtitle">
                <img width={24} height={24} src={value.icon} className="sc-icon" />
                <div className="sc-text">{value.name}</div>
                {/*  TODO add copy address*/}
              </div>
            </Dropdown.Header>
            <div className="dropdown-list">
              <Dropdown.Item onClick={() => disconnectWallet(value.chainId)}>
                <div className="icon icon-disconnect"></div>
                Disconnect Wallet
              </Dropdown.Item>
              <Dropdown.Item onClick={() => changeWallet(value.chainId)}>
                <div className="icon icon-change-wallet"></div>
                Change Wallet
              </Dropdown.Item>
              {value.additionalWalletActions?.map(value => (
                <Dropdown.Item onClick={value.onClick} key={value.text}>
                  {typeof(value.icon)==="string" ? (
                    <div className={`icon ${value.icon}`}></div>
                  ) : value.icon}
                  {value.text}
                </Dropdown.Item>
              ))}
            </div>
          </div>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export function WalletConnector() {
  const { chains, connectWallet } = useContext(ChainsContext);

  const [connectedWallets, nonConnectedChains] = useMemo(() => {
    const nonConnectedChains: Chain<any>[] = [];
    const connectedWallets: {
      [walletName: string]: MultichainWallet;
    } = {};
    for (let chain in chains) {
      const chainData: Chain<any> = chains[chain];
      if (chainData.wallet == null) {
        nonConnectedChains.push(chainData);
        continue;
      }
      connectedWallets[chainData.wallet.name] ??= {
        name: chainData.wallet.name,
        icon: chainData.wallet.icon,
        chains: {},
      };
      connectedWallets[chainData.wallet.name].chains[chain] = {
        name: chainData.chain.name,
        icon: chainData.chain.icon,
        chainId: chain,
        additionalWalletActions: chainData.wallet.additionalWalletActions
      };
    }

    return [Object.keys(connectedWallets).map((key) => connectedWallets[key]), nonConnectedChains];
  }, [chains, connectWallet]);

  return (
    <div className="wallet-connections">
      {connectedWallets &&
        connectedWallets.map((value) => (
          <MultichainWalletMenuItem key={value.name} wallet={value} />
        ))}

      {nonConnectedChains.length > 0 ? (
        <Dropdown align="end">
          {connectedWallets.length == 0 ? (
            <Dropdown.Toggle
              as={BaseButton}
              className="wallet-connections__button is-main is-full"
              variant="transparent"
              customIcon="connect"
              bsPrefix="none"
            >
              Connect Wallet
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
            <Dropdown.Header className="wallet-connections__dropdown__title">
              Connect Wallet
            </Dropdown.Header>
            <div className="wallet-connections__list">
              {nonConnectedChains.map((value) => (
                <BaseButton
                  key={value.chainId}
                  onClick={() => connectWallet(value.chainId)}
                  variant="transparent"
                  className="wallet-connections__row"
                >
                  <img src={value.chain.icon} alt={value.chain.name} width={24} height={24} />
                  <span className="wallet-connections__row__name">{value.chain.name}</span>
                  <span className="wallet-connections__row__arrow icon icon-arrow-right" />
                </BaseButton>
              ))}
            </div>
          </Dropdown.Menu>
        </Dropdown>
      ) : null}
    </div>
  );
}
