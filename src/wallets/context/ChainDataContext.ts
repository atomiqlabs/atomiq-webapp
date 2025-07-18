import { createContext } from 'react';
import {StarknetSigner} from "@atomiqlabs/chain-starknet";
import {WebLNProvider} from "webln";
import {SolanaSigner} from "@atomiqlabs/chain-solana";
import {ChainWalletData} from "../ChainDataProvider";
import {ExtensionBitcoinWallet} from "../chains/bitcoin/base/ExtensionBitcoinWallet";
import {EVMSigner} from "@atomiqlabs/chain-evm";

type WalletTypes = {
   BITCOIN: ExtensionBitcoinWallet,
   LIGHTNING: WebLNProvider,
   SOLANA: SolanaSigner,
   STARKNET: StarknetSigner,
   CITREA: EVMSigner
};

export type ChainIdentifiers = "BITCOIN" | "LIGHTNING" | "SOLANA" | "STARKNET" | "CITREA";

export const ChainDataContext: React.Context<{
    [chain in ChainIdentifiers]?: ChainWalletData<WalletTypes[chain]>
}> = createContext(undefined);
