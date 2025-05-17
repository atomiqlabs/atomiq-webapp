import {SolanaWalletWrapper, useSolanaWalletData} from "./chains/useSolanaWalletData";
import {useBitcoinWalletData} from "./chains/useBitcoinWalletData";
import {useStarknetWalletData} from "./chains/useStarknetWalletData";
import {useLightningWalletData} from "./chains/useLightningWalletData";
import { ChainDataContext } from "./context/ChainDataContext";
import {useMemo} from "react";

export type ChainWalletData<T> = {
    chain: {
        name: string,
        icon: string
    },
    wallet: {
        name: string,
        icon: string,
        address?: string,
        instance: T
    },
    id: string,
    disconnect: () => Promise<void> | void,
    connect: () => Promise<void> | void,
    changeWallet?: () => Promise<void> | void,
    swapperOptions?: any
};

function WrappedChainDataProvider(props: {children: React.ReactNode}) {
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData();
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [lightningChain] = useLightningWalletData();

    return (
        <ChainDataContext.Provider value={useMemo(() => {
            const res: any = {
                BITCOIN: bitcoinChain,
                LIGHTNING: lightningChain
            };
            if(solanaChain!=null) res.SOLANA = solanaChain;
            if(starknetChain!=null) res.STARKNET = starknetChain;
            return res;
        }, [bitcoinChain, lightningChain, solanaChain, starknetChain])}>
            {bitcoinModal}
            {props.children}
        </ChainDataContext.Provider>
    );
}

export function ChainDataProvider(props: {children: React.ReactNode}) {
    return (
        <SolanaWalletWrapper>
            <WrappedChainDataProvider>
                {props.children}
            </WrappedChainDataProvider>
        </SolanaWalletWrapper>
    );
}
