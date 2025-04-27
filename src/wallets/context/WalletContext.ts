import { createContext } from 'react';
import {StarknetSigner} from "@atomiqlabs/chain-starknet";
import {BitcoinWallet} from "../../bitcoin/onchain/BitcoinWallet";
import {WebLNProvider} from "webln";
import {SolanaSigner} from "@atomiqlabs/chain-solana";
import {ChainWalletData} from "../WalletProvider";

type WalletTypes = {
   BITCOIN: BitcoinWallet,
   LIGHTNING: WebLNProvider,
   SOLANA: SolanaSigner,
   STARKNET: StarknetSigner
};

export type ChainIdentifiers = "BITCOIN" | "LIGHTNING" | "SOLANA" | "STARKNET";

export const WalletContext: React.Context<{
    [chain in ChainIdentifiers]: ChainWalletData<WalletTypes[chain]>
}> = createContext(undefined);
