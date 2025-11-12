import { AbstractSigner, ISwap } from '@atomiqlabs/sdk';
import { ChainsContext } from '../../context/ChainsContext';
import { Chain } from '../../providers/ChainsProvider';
import { useContext } from 'react';

export function useSmartChainWallet(
  swap: ISwap,
  requireSameAsInitiator?: boolean
): Chain<AbstractSigner>['wallet'] {
  const chainsData = useContext(ChainsContext);
  const wallet: Chain<AbstractSigner>['wallet'] =
    chainsData.chains[swap.chainIdentifier].wallet;
  if (wallet == null) return undefined;
  if (requireSameAsInitiator) {
    if (wallet?.instance?.getAddress() !== swap._getInitiator()) return null;
  }
  return wallet;
}
