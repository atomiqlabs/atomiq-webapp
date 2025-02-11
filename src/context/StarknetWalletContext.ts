import { createContext } from 'react';
import {WalletAccount} from "starknet";

export const StarknetWalletContext: React.Context<{
    starknetWallet: WalletAccount,
    connect: () => Promise<void>,
    disconnect: () => void
}> = createContext({
    starknetWallet: null,
    connect: () => Promise.resolve(),
    disconnect: () => {}
});
