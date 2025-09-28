import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { Token } from '@atomiqlabs/sdk';
import { useChainForCurrency } from './hooks/useChainForCurrency';
import { BaseButton, BaseButtonVariantProps } from '../components/BaseButton';
import { WalletBalanceResult } from './hooks/useWalletBalance';

const ConnectedWallet = React.forwardRef<any, any>(({ name, onClick, noText }, ref) => (
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

export function ConnectedWalletAnchor({
  className,
  noText,
  currency,
  variantButton = 'transparent',
  simple = false,
  maxSpendable,
}: {
  className?: string;
  noText?: boolean;
  simple?: boolean;
  currency: Token;
  variantButton?: BaseButtonVariantProps;
  maxSpendable?: WalletBalanceResult;
}) {
  const { wallet, connect, disconnect, changeWallet, chain } = useChainForCurrency(currency);

  if (wallet == null && connect == null) {
    return <></>;
  }

  if (simple && wallet != null) {
    return (
      <div className="wallet-connections wallet-connections__simple">
        <img width={16} height={16} src={wallet.icon} alt={wallet.name} />
        <div className="wallet-connections__amount">{maxSpendable?.balance?.amount ?? '-'}</div>
        {/* TODO implement this */}
        {/*<Button*/}
        {/*  variant="outline-light"*/}
        {/*  style={{ marginBottom: '2px' }}*/}
        {/*  className="py-0 px-1"*/}
        {/*  disabled={locked || amountsLocked}*/}
        {/*  onClick={() => {*/}
        {/*    setExactIn(true);*/}
        {/*    inputRef.current.setValue(maxSpendable?.balance?.amount);*/}
        {/*  }}*/}
        {/*>*/}
        {/*  <small className="font-smallest" style={{ marginBottom: '-2px' }}>*/}
        {/*    MAX*/}
        {/*  </small>*/}
        {/*</Button>*/}
      </div>
    );
  }

  return (
    <>
      {wallet == null ? (
        <BaseButton
          customIcon="connect"
          onClick={() => connect()}
          variant={variantButton}
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
            className={className}
            name={wallet.name}
            icon={wallet.icon}
            noText={noText}
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
