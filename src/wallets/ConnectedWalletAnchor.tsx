import { Button, Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { Token } from '@atomiqlabs/sdk';
import { useChainForCurrency } from './hooks/useChainForCurrency';
import { BaseButton } from '../components/BaseButton';
import { close } from 'react-icons-kit/fa/close';

const ConnectedWallet = React.forwardRef<any, any>(({ name, icon, onClick, noText }, ref) => (
  <BaseButton
    icon={<Icon size={12} icon={ic_brightness_1} className="wallet-connections__indicator" />}
    variant="transparent"
    className="w-100 justify-content-start"
    size="smaller"
    onClick={onClick}
  >
    {!noText ? name : ''}
  </BaseButton>
));

export function ConnectedWalletAnchor(props: {
  className?: string;
  noText?: boolean;
  currency: Token;
}) {
  const { wallet, connect, disconnect, changeWallet, chain } = useChainForCurrency(props.currency);

  if (wallet == null && connect == null) return <></>;

  return (
    <>
      {wallet == null ? (
        <BaseButton
          customIcon="connect"
          onClick={() => connect()}
          variant="transparent"
          size="smaller"
          className="wallet-connections__item__button"
        >
          Connect Wallet
        </BaseButton>
      ) : (
        <Dropdown align={{ md: 'start' }}>
          <Dropdown.Toggle
            as={ConnectedWallet}
            id="dropdown-custom-components"
            className={props.className}
            name={wallet.name}
            icon={wallet.icon}
            noText={props.noText}
          >
            Custom toggle
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item eventKey="1" onClick={disconnect}>
              Disconnect
            </Dropdown.Item>
            {changeWallet != null ? (
              <Dropdown.Item
                eventKey="2"
                onClick={() => {
                  changeWallet();
                }}
              >
                Change wallet
              </Dropdown.Item>
            ) : (
              ''
            )}
          </Dropdown.Menu>
        </Dropdown>
      )}
    </>
  );
}
