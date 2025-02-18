import { createContext } from 'react';
import {StarknetWindowObject} from "@starknet-io/get-starknet";
import {StarknetSigner} from "@atomiqlabs/chain-starknet";

export const StarknetWalletContext: React.Context<{
    starknetSigner?: StarknetSigner,
    starknetWalletData?: StarknetWindowObject,
    connect?: () => Promise<void>,
    disconnect?: () => Promise<void>,
    changeWallet?: () => Promise<void>,
    reconnect?: () => Promise<void>
}> = createContext({});
