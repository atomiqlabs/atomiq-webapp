import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as React from 'react';
import { Token, TokenAmount } from '@atomiqlabs/sdk';
import { useChain } from '../../hooks/chains/useChain';
import { BaseButton, BaseButtonVariantProps } from '../common/BaseButton';
import { useContext } from 'react';
import { ChainsContext } from '../../context/ChainsContext';
import {useWallet} from "../../hooks/wallets/useWallet";

export function WalletInfoBadge({
  currency,
  variantButton = 'transparent',
  maxSpendable,
  setMax,
  input,
}: {
  currency: Token;
  variantButton?: BaseButtonVariantProps;
  maxSpendable?: TokenAmount;
  setMax?: () => void;
  input?: boolean;
}) {
  const { hasWallets, chainId } = useChain(currency) ?? {};
  const wallet = useWallet(currency, input);
  const { connectWallet, disconnectWallet } = useContext(ChainsContext);

  return (
    <div style={{height: "23px"}}>
      {wallet!=null
        ? (
          <div className="wallet-connections wallet-connections__simple">
            <img width={16} height={16} src={wallet.icon} alt={wallet.name} />
            {wallet.address!=null ? (
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
                {wallet.name}
              </div>
            )}
            <div className="wallet-connections__simple__disconnect">
              <OverlayTrigger overlay={<Tooltip>Disconnect wallet</Tooltip>}>
                <div className="icon icon-disconnect" onClick={() => disconnectWallet(chainId)}></div>
              </OverlayTrigger>
            </div>
          </div>
        )
        : hasWallets!=null
          ? (
            <BaseButton
              customIcon="connect"
              onClick={() => connectWallet(chainId)}
              variant={variantButton}
              size="smaller"
              className="wallet-connections__item__button"
            >
              Connect Wallet
            </BaseButton>
          ) : ''}
    </div>
  );
}
