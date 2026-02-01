import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { Token, isBtcToken, TokenAmount } from '@atomiqlabs/sdk';
import { useChain } from '../../hooks/chains/useChain';
import { BaseButton, BaseButtonVariantProps } from '../common/BaseButton';
import { WalletBalanceResult } from '../../hooks/wallets/useWalletBalance';
import { useContext } from 'react';
import { ChainsContext } from '../../context/ChainsContext';
import {useWallet} from "../../hooks/wallets/useWallet";

const ConnectedWallet = React.forwardRef<any, any>(({ name, onClick, noText }, _ref) => (
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

export function WalletInfoBadge({
  className,
  noText,
  currency,
  variantButton = 'transparent',
  simple = false,
  maxSpendable,
  setMax,
  input,
}: {
  className?: string;
  noText?: boolean;
  simple?: boolean;
  currency: Token;
  variantButton?: BaseButtonVariantProps;
  maxSpendable?: TokenAmount;
  setMax?: () => void;
  input?: boolean;
}) {
  const { hasWallets, chainId } = useChain(currency);
  const wallet = useWallet(currency, input);
  const { connectWallet, disconnectWallet, changeWallet } = useContext(ChainsContext);

  if (wallet == null && hasWallets == null) {
    return <></>;
  }
  const isLightning = isBtcToken(currency) && currency.lightning;

  if (simple && wallet != null) {
    return (
      <div className="wallet-connections wallet-connections__simple">
        <img width={16} height={16} src={wallet.icon} alt={wallet.name} />
        {!isLightning ? (
          <>
            {maxSpendable?.amount ? (
              <>
                <div className="wallet-connections__amount">
                  {maxSpendable.amount} {currency.ticker}
                </div>
                {setMax ? (
                  <BaseButton
                    variant="border-only"
                    className="wallet-connections__simple__max"
                    onClick={setMax}
                  >
                    max
                  </BaseButton>
                ) : null}
              </>
            ) : (
              <div className="wallet-connections__amount is-loading"></div>
            )}
          </>
        ) : (
          <div className="wallet-connections__amount">
            {wallet?.name}
          </div>
        )}
        <div className="wallet-connections__simple__disconnect">
          <OverlayTrigger overlay={<Tooltip>Disconnect wallet</Tooltip>}>
            <div className="icon icon-disconnect" onClick={() => disconnectWallet(chainId)}></div>
          </OverlayTrigger>
        </div>
      </div>
    );
  }

  return (
    <>
      {wallet == null ? (
        <BaseButton
          customIcon="connect"
          onClick={() => connectWallet(chainId)}
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
            <Dropdown.Item eventKey="1" onClick={() => disconnectWallet(chainId)}>
              Disconnect
            </Dropdown.Item>
            {changeWallet != null ? (
              <Dropdown.Item
                eventKey="2"
                onClick={() => {
                  changeWallet(chainId);
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
