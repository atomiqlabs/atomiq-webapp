import {SolanaWalletWrapper, useSolanaWalletData} from "./chains/useSolanaWalletData";
import {useBitcoinWalletData} from "./chains/useBitcoinWalletData";
import {useStarknetWalletData} from "./chains/useStarknetWalletData";
import {useLightningWalletData} from "./chains/useLightningWalletData";
import { ChainDataContext } from "./context/ChainDataContext";
import {useMemo} from "react";
import {EVMWalletWrapper, useCitreaWallet, useBotanixWallet} from "./chains/useEVMWallet";

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
    const [starknetChain] = useStarknetWalletData();
    const [solanaChain] = useSolanaWalletData();
    const [citreaChain] = useCitreaWallet();
    const [botanixChain] = useBotanixWallet();
    const [lightningChain] = useLightningWalletData();
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData(useMemo(() => {
        return {
            STARKNET: starknetChain?.wallet?.name,
            SOLANA: solanaChain?.wallet?.name
        };
    }, [starknetChain?.wallet, solanaChain?.wallet]));

    return (
        <ChainDataContext.Provider value={useMemo(() => {
            const res: any = {
                BITCOIN: bitcoinChain,
                LIGHTNING: lightningChain
            };
            if(solanaChain!=null) res.SOLANA = solanaChain;
            if(starknetChain!=null) res.STARKNET = starknetChain;
            if(citreaChain!=null) res.CITREA = citreaChain;
            if(botanixChain!=null) res.BOTANIX = botanixChain;
            return res;
        }, [bitcoinChain, lightningChain, solanaChain, starknetChain, citreaChain, botanixChain])}>
            {bitcoinModal}
            {props.children}
        </ChainDataContext.Provider>
    );
}

export function ChainDataProvider(props: {children: React.ReactNode}) {
    return (
        <EVMWalletWrapper>
            <SolanaWalletWrapper>
                <WrappedChainDataProvider>
                    {props.children}
                </WrappedChainDataProvider>
            </SolanaWalletWrapper>
        </EVMWalletWrapper>
    );
}
