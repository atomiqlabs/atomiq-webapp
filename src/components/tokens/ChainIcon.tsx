import { Token } from '@atomiqlabs/sdk';
import * as React from 'react';
import { TokenIcon } from './TokenIcon';
import {Chains} from "../../utils/Chains";

export function ChainIcon(props: { token: Token, className?: string }) {
  const tokenChain = Chains[props.token.chainId];

  return (
    <div className={(props.className ?? "")+" chain-icon"}>
      <TokenIcon tokenOrTicker={props.token} className="chain-icon__img" />
      <img
        src={tokenChain?.icon}
        alt={tokenChain?.name}
        className="chain-icon__currency"
      />
    </div>
  );
}
