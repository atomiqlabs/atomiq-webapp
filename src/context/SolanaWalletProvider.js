import { jsx as _jsx } from "react/jsx-runtime";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { LedgerWalletAdapter, PhantomWalletAdapter, TorusWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { FEConstants } from "../FEConstants";
const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: FEConstants.solanaChain }),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter()
];
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
function SolanaWalletProvider(props) {
    return (_jsx(ConnectionProvider, { endpoint: FEConstants.rpcUrl, config: { fetch: fetchWithTimeout, commitment: "confirmed" }, children: _jsx(WalletProvider, { wallets: wallets, autoConnect: true, children: _jsx(WalletModalProvider, { children: props.children }) }) }));
}
export default SolanaWalletProvider;
