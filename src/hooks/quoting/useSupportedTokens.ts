import { useContext, useEffect, useMemo, useState } from 'react';
import { SwapperContext } from '../../context/SwapperContext';
import {isSCToken, Token} from '@atomiqlabs/sdk';
import {supportedSmartChainTokenIdentifiers, toTokenIdentifier} from "../../utils/Tokens";

export function useSupportedTokens(): [Token[], Token[]] {
  const { swapper } = useContext(SwapperContext);
  const [updateCount, setUpdateCount] = useState<number>(0);
  useEffect(() => {
    if (swapper == null) return;
    const listener = () => {
      setUpdateCount((val) => val + 1);
    };
    swapper.on('lpsRemoved', listener);
    swapper.on('lpsAdded', listener);
    return () => {
      swapper.removeListener('lpsRemoved', listener);
      swapper.removeListener('lpsAdded', listener);
    };
  }, [swapper]);
  return useMemo(() => {
    return [
      swapper?.getSupportedTokens(true)?.filter(token => !isSCToken(token) || supportedSmartChainTokenIdentifiers.has(toTokenIdentifier(token))),
      swapper?.getSupportedTokens(false)?.filter(token => !isSCToken(token) || supportedSmartChainTokenIdentifiers.has(toTokenIdentifier(token)))
    ];
  }, [swapper, updateCount]);
}
