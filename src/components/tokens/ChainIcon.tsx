import { Token } from '@atomiqlabs/sdk';
import * as React from 'react';
import { TokenIcon } from './TokenIcon';
import { useChain } from '../../hooks/chains/useChain';

export function ChainIcon(props: { token: Token }) {
  const tokenChain = useChain(props.token);

  return (
    <div className="chain-icon">
      <TokenIcon tokenOrTicker={props.token} className="chain-icon__img" />
      <img
        src={tokenChain?.chain.icon}
        alt={tokenChain?.chain.name}
        className="chain-icon__currency"
      />
    </div>
  );
}
