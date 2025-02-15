import {useWallet} from "@solana/wallet-adapter-react";
import {useContext, useMemo} from "react";
import {StarknetWalletContext} from "../context/StarknetWalletContext";
import {BitcoinWalletContext} from "../context/BitcoinWalletProvider";
import {WebLNContext} from "../context/WebLNContext";
import {isBtcToken, Token} from "@atomiqlabs/sdk";
import {useWalletModal} from "@solana/wallet-adapter-react-ui";
import {FEConstants} from "../FEConstants";

type ChainWalletData = {
    chainName: string,
    chainLogo: string,
    name: string,
    icon: string,
    disconnect: () => Promise<void> | void,
    connect: () => Promise<void> | void,
    changeWallet?: () => Promise<void> | void
};

export function useWalletList(): {[chain: string]: ChainWalletData} {
    const {setVisible: setModalVisible} = useWalletModal()
    const {wallet: solanaWallet, disconnect: solanaDisconnect} = useWallet();
    const {starknetWalletData: starknetWallet, disconnect: starknetDisconnect, connect: starknetConnect, changeWallet: starknetChangeWallet} = useContext(StarknetWalletContext);
    const {bitcoinWallet, disconnect: bitcoinDisconnect, connect: bitcoinConnect, changeWallet: bitcoinChangeConnect} = useContext(BitcoinWalletContext);
    const {lnWallet, disconnect: lnDisconnect, connect: lnConnect} = useContext(WebLNContext);

    const chainWalletData: {[chain: string]: ChainWalletData} = useMemo(() => {
        const obj = {
            BITCOIN: {
                chainName: "Bitcoin",
                chainLogo: "/icons/chains/BITCOIN.svg",
                name: bitcoinWallet?.getName(),
                icon: bitcoinWallet?.getIcon(),
                disconnect: bitcoinDisconnect,
                connect: bitcoinConnect,
                changeWallet: bitcoinChangeConnect
            },
            LIGHTNING: {
                chainName: "Lightning",
                chainLogo: "/icons/chains/LIGHTNING.svg",
                name: lnWallet!=null ? "WebLN" : null,
                icon: lnWallet!=null ? "/wallets/WebLN.png" : null,
                disconnect: lnDisconnect,
                connect: lnConnect
            }
        };
        if(FEConstants.allowedChains.has("SOLANA")) obj["SOLANA"] = {
            chainName: "Solana",
            chainLogo: "/icons/chains/SOLANA.svg",
            name: solanaWallet?.adapter?.name,
            icon: solanaWallet?.adapter?.icon,
            disconnect: solanaDisconnect,
            connect: () => setModalVisible(true),
            changeWallet: () => setModalVisible(true)
        };
        if(FEConstants.allowedChains.has("STARKNET")) obj["STARKNET"] = {
            chainName: "Starknet",
            chainLogo: "/icons/chains/STARKNET.svg",
            name: starknetWallet?.name,
            icon: typeof(starknetWallet?.icon)!=="string" ? starknetWallet?.icon?.dark : starknetWallet?.icon,
            connect: starknetConnect,
            disconnect: starknetDisconnect,
            changeWallet: starknetChangeWallet
        };
        return obj;
    }, [solanaWallet, starknetWallet, bitcoinWallet, lnWallet]);

    return chainWalletData;
}

export function useWalletForCurrency(token: Token) {
    const connectedWallets = useWalletList();

    if(isBtcToken(token)) {
        if(token.lightning) {
            return connectedWallets["LIGHTNING"];
        } else {
            return connectedWallets["BITCOIN"];
        }
    } else {
        return connectedWallets[token.chainId];
    }

}
