import { ChainsContext } from '../../context/ChainsContext';
import { useContext } from 'react';
export function useSmartChainWallet(swap, requireSameAsInitiator) {
    const chainsData = useContext(ChainsContext);
    const wallet = chainsData.chains[swap.chainIdentifier].wallet;
    if (wallet == null)
        return undefined;
    if (requireSameAsInitiator) {
        if (wallet?.instance?.getAddress() !== swap._getInitiator())
            return null;
    }
    return wallet;
}
