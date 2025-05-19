import { createContext } from 'react';
import {WebLNProvider} from "webln";

export const WebLNContext: React.Context<{
    lnWallet?: WebLNProvider,
    connect?: () => void,
    disconnect?: () => void
}> = createContext({});
