import { useContext } from 'react';
import { Token } from '@atomiqlabs/sdk';
import { ChainsContext } from '../../context/ChainsContext';
import { Chain } from '../../providers/ChainsProvider';
import { getChainIdentifierForCurrency } from '../../utils/Tokens';

export function useChain(tokenOrChainId: Token | string): Chain<any> {
  const connectedWallets = useContext(ChainsContext);
  if (!tokenOrChainId) return undefined;
  return connectedWallets.chains[
    typeof tokenOrChainId === 'string'
      ? tokenOrChainId
      : getChainIdentifierForCurrency(tokenOrChainId)
  ];
}
