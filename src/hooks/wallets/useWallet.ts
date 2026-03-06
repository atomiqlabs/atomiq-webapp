import { useContext } from 'react';
import {Token} from '@atomiqlabs/sdk';
import { ChainsContext } from '../../context/ChainsContext';
import { Chain } from '../../providers/ChainsProvider';
import { getChainIdentifierForCurrency } from '../../utils/Tokens';

export function useWallet(tokenOrChainId: Token | string, input?: boolean): Chain<any>['wallet'] {
  const chainsContext = useContext(ChainsContext);
  if (!tokenOrChainId) return undefined;
  if (chainsContext == null) return undefined;
  const {chains} = chainsContext;
  const chain: Chain<any> = chains[
    typeof tokenOrChainId === 'string'
      ? tokenOrChainId
      : getChainIdentifierForCurrency(tokenOrChainId)
  ];
  if(!chain.wallet) return null;
  if(input===false && chain.wallet.onlyInput) return null;
  return chain.wallet;
}
