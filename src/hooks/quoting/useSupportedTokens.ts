import { useContext, useEffect, useMemo, useState } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import {isSCToken, Token} from '@atomiqlabs/sdk';
import {supportedSmartChainTokenIdentifiers, toTokenIdentifier} from "../../utils/Tokens";

export function useSupportedTokens(): [Token[], Token[]] {
  const { initializedSwapper } = useContext(SwapperContext);
  const [updateCount, setUpdateCount] = useState<number>(0);
  useEffect(() => {
    if (initializedSwapper == null) return;
    const listener = () => {
      setUpdateCount((val) => val + 1);
    };
    initializedSwapper.on('lpsRemoved', listener);
    initializedSwapper.on('lpsAdded', listener);
    return () => {
      initializedSwapper.removeListener('lpsRemoved', listener);
      initializedSwapper.removeListener('lpsAdded', listener);
    };
  }, [initializedSwapper]);
  return useMemo(() => {
    return [
      initializedSwapper?.getSupportedTokens(true)?.filter(token => !isSCToken(token) || supportedSmartChainTokenIdentifiers.has(toTokenIdentifier(token))),
      initializedSwapper?.getSupportedTokens(false)?.filter(token => !isSCToken(token) || supportedSmartChainTokenIdentifiers.has(toTokenIdentifier(token)))
    ];
  }, [initializedSwapper, updateCount]);
}
