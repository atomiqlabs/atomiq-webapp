import * as React from "react";
import {WalletModalProvider} from "@solana/wallet-adapter-react-ui";
import {ConnectionProvider, WalletProvider} from "@solana/wallet-adapter-react";
import {LedgerWalletAdapter, PhantomWalletAdapter, TorusWalletAdapter, SolflareWalletAdapter} from "@solana/wallet-adapter-wallets";
import {FEConstants} from "../FEConstants";

const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: FEConstants.solanaChain }),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter()
];

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit) => {
    if(init==null) init = {};

    let timedOut = false;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
        timedOut = true;
        abortController.abort("Timed out")
    }, 15000);
    let originalSignal: AbortSignal;
    if(init.signal!=null) {
        originalSignal = init.signal;
        init.signal.addEventListener("abort", (reason) => {
            clearTimeout(timeoutHandle);
            abortController.abort(reason);
        });
    }
    init.signal = abortController.signal;
    try {
        return await fetch(input, init)
    } catch(e) {
        console.error("SolanaWalletProvider: fetchWithTimeout("+typeof(e)+"): ", e);
        if(e.name==="AbortError" && (originalSignal==null || !originalSignal.aborted) && timedOut) {
            throw new Error("Network request timed out")
        } else {
            throw e instanceof Error ? e : new Error(e);
        }
    }
};

function SolanaWalletProvider(props: {
    children: any
}) {
    return (
        <ConnectionProvider endpoint={FEConstants.solanaRpcUrl} config={{fetch: fetchWithTimeout, commitment: "confirmed"}}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {props.children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )

}

export default SolanaWalletProvider;