import { useContext } from 'react';
import { ChainsContext } from '../../context/ChainsContext';
import { getChainIdentifierForCurrency } from '../../utils/Tokens';
export function useChain(tokenOrChainId) {
    const connectedWallets = useContext(ChainsContext);
    if (!tokenOrChainId)
        return undefined;
    return connectedWallets.chains[typeof tokenOrChainId === 'string'
        ? tokenOrChainId
        : getChainIdentifierForCurrency(tokenOrChainId)];
}
