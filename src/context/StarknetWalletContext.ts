import { createContext } from 'react';
import {StarknetSigner} from "@atomiqlabs/sdk";
import {StarknetWindowObject} from "@starknet-io/get-starknet";

export const StarknetWalletContext: React.Context<{
    starknetSigner?: StarknetSigner,
    starknetWalletData?: StarknetWindowObject,
    connect?: () => Promise<void>,
    disconnect?: () => Promise<void>,
    changeWallet?: () => Promise<void>,
    reconnect?: () => Promise<void>
}> = createContext({});
