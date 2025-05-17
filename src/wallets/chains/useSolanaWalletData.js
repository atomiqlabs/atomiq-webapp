import { jsx as _jsx } from "react/jsx-runtime";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SolanaFees, SolanaSigner } from "@atomiqlabs/chain-solana";
import { useCallback, useMemo } from "react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { LedgerWalletAdapter, PhantomWalletAdapter, TorusWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { FEConstants } from "../../FEConstants";
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: FEConstants.solanaChain }),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter()
];
const jitoPubkey = "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL";
const jitoEndpoint = "https://mainnet.block-engine.jito.wtf/api/v1/transactions";
const fetchWithTimeout = async (input, init) => {
    if (init == null)
        init = {};
    let timedOut = false;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
        timedOut = true;
        abortController.abort("Timed out");
    }, 15000);
    let originalSignal;
    if (init.signal != null) {
        originalSignal = init.signal;
        init.signal.addEventListener("abort", (reason) => {
            clearTimeout(timeoutHandle);
            abortController.abort(reason);
        });
    }
    init.signal = abortController.signal;
    try {
        return await fetch(input, init);
    }
    catch (e) {
        console.error("SolanaWalletProvider: fetchWithTimeout(" + typeof (e) + "): ", e);
        if (e.name === "AbortError" && (originalSignal == null || !originalSignal.aborted) && timedOut) {
            throw new Error("Network request timed out");
        }
        else {
            throw e instanceof Error ? e : new Error(e);
        }
    }
};
export function SolanaWalletWrapper(props) {
    return (_jsx(ConnectionProvider, { endpoint: FEConstants.solanaRpcUrl ?? "http://example.com/", config: { fetch: fetchWithTimeout, commitment: "confirmed" }, children: _jsx(WalletProvider, { wallets: wallets, autoConnect: true, children: _jsx(WalletModalProvider, { children: props.children }) }) }));
}
export function useSolanaWalletData() {
    const { setVisible } = useWalletModal();
    const { wallet, disconnect } = useWallet();
    const solanaWallet = useAnchorWallet();
    const { connection } = useConnection();
    const solanaSigner = useMemo(() => solanaWallet == null ? null : new SolanaSigner(solanaWallet), [solanaWallet]);
    const connect = useCallback(() => {
        setVisible(true);
    }, [setVisible]);
    return useMemo(() => {
        if (!FEConstants.allowedChains.has("SOLANA"))
            return [null];
        const solanaFees = new SolanaFees(connection, 1000000, 2, 100, "auto", "high", () => 50000n
        //, {
        //    address: jitoPubkey,
        //    endpoint: jitoEndpoint
        //}
        );
        return [{
                chain: {
                    name: "Solana",
                    icon: "/icons/chains/SOLANA.svg",
                },
                wallet: wallet == null ? null : {
                    name: wallet.adapter?.name,
                    icon: wallet.adapter?.icon,
                    instance: solanaSigner,
                    address: wallet.adapter?.publicKey?.toBase58()
                },
                id: "SOLANA",
                disconnect,
                connect,
                changeWallet: connect,
                swapperOptions: {
                    rpcUrl: connection,
                    retryPolicy: {
                        transactionResendInterval: 3000
                    },
                    fees: solanaFees
                }
            }];
    }, [wallet, solanaSigner, disconnect, connect, connection]);
}
