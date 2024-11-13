import { createContext } from 'react';
import {WebLNProvider} from "webln";

export const WebLNContext: React.Context<{
    lnWallet: WebLNProvider,
    setLnWallet: (wallet: WebLNProvider) => void
}> = createContext({
    lnWallet: null,
    setLnWallet: null
});
