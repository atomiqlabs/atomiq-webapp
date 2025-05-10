import { createContext } from 'react';
import {StarknetSigner} from "@atomiqlabs/chain-starknet";
import {WebLNProvider} from "webln";
import {SolanaSigner} from "@atomiqlabs/chain-solana";
import {ChainWalletData} from "../ChainDataProvider";
import {BitcoinWallet} from "../chains/bitcoin/base/BitcoinWallet";

type WalletTypes = {
   BITCOIN: BitcoinWallet,
   LIGHTNING: WebLNProvider,
   SOLANA: SolanaSigner,
   STARKNET: StarknetSigner
};

export type ChainIdentifiers = "BITCOIN" | "LIGHTNING" | "SOLANA" | "STARKNET";

export const ChainDataContext: React.Context<{
    [chain in ChainIdentifiers]: ChainWalletData<WalletTypes[chain]>
}> = createContext(undefined);
