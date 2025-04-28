import {SolanaWalletWrapper, useSolanaWalletData} from "./chains/useSolanaWalletData";
import {useBitcoinWalletData} from "./chains/useBitcoinWalletData";
import {useStarknetWalletData} from "./chains/useStarknetWalletData";
import {useLightningWalletData} from "./chains/useLightningWalletData";
import { WalletContext } from "./context/WalletContext";
import {useMemo} from "react";

export type ChainWalletData<T> = {
    chain: {
        name: string,
        icon: string
    },
    wallet: {
        name: string,
        icon: string,
        instance: T
    }
    disconnect: () => Promise<void> | void,
    connect: () => Promise<void> | void,
    changeWallet?: () => Promise<void> | void
};

function WrappedWalletProvider(props: {children: React.ReactNode}) {
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData();
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [lightningChain] = useLightningWalletData();

    return (
        <WalletContext.Provider value={useMemo(() => ({
            BITCOIN: bitcoinChain,
            LIGHTNING: lightningChain,
            SOLANA: solanaChain,
            STARKNET: starknetChain
        }), [bitcoinChain, lightningChain, solanaChain, starknetChain])}>
            {bitcoinModal}
            {props.children}
        </WalletContext.Provider>
    );
}

export function WalletProvider(props: {children: React.ReactNode}) {
    return (
        <SolanaWalletWrapper>
            <WrappedWalletProvider>
                {props.children}
            </WrappedWalletProvider>
        </SolanaWalletWrapper>
    );
}
