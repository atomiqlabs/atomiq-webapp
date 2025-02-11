import {useCallback, useEffect, useState} from "react";
import {WalletAccount} from "starknet";
import {connect, disconnect} from "@starknet-io/get-starknet";
import {FEConstants} from "../FEConstants";
import {timeoutPromise} from "@atomiqlabs/sdk";

export function useStarknetWalletContext(): {
    starknetWallet: WalletAccount,
    connect: () => Promise<void>,
    disconnect: () => void
} {
    const [starknetWallet, setStarknetWallet] = useState<WalletAccount>();

    useEffect(() => {
        timeoutPromise(3000)
            .then(() => connect({ modalMode: 'neverAsk', modalTheme: 'dark' }))
            .then(swo => {
                console.log("useStarknetWalletContext(): Initial wallet connection: ", swo);
                if(swo==null) return;
                const walletAccount = new WalletAccount(FEConstants.starknetRpc, swo as any);
                setStarknetWallet(walletAccount);
            });
    }, []);

    const _connect: () => Promise<void> = useCallback(async () => {
        const swo = await connect({ modalMode: 'alwaysAsk', modalTheme: 'dark' });
        console.log("useStarknetWalletContext(): connect() wallet connection: ", swo);
        if(swo==null) return;
        setStarknetWallet(new WalletAccount(FEConstants.starknetRpc, swo as any));
    }, []);

    const _disconnect: (skipToggleAutoConnect?: boolean) => void = useCallback((skipToggleAutoConnect?: boolean) => {
        disconnect({clearLastWallet: true}).catch(e => console.error("useStarknetWalletContext: error while disconnect", e));
        setStarknetWallet(null);
    }, []);

    return {starknetWallet, connect: _connect, disconnect: _disconnect};

}