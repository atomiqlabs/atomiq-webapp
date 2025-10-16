import { createContext } from "react";
import { StarknetSigner } from "@atomiqlabs/chain-starknet";
import { WebLNProvider } from "webln";
import { SolanaSigner } from "@atomiqlabs/chain-solana";
import { ChainWalletData } from "../ChainDataProvider";
import { ExtensionBitcoinWallet } from "../chains/bitcoin/base/ExtensionBitcoinWallet";

type WalletTypes = {
  BITCOIN: ExtensionBitcoinWallet;
  LIGHTNING: WebLNProvider;
  SOLANA: SolanaSigner;
  STARKNET: StarknetSigner;
};

export type ChainIdentifiers = "BITCOIN" | "LIGHTNING" | "SOLANA" | "STARKNET";

export const ChainDataContext: React.Context<{
  chains: {
    [chain in ChainIdentifiers]?: ChainWalletData<WalletTypes[chain]>
  };
  connectWallet: (chainIdentifier: string) => void;
  disconnectWallet: (chainIdentifier: string) => Promise<void>;
  changeWallet: (chainIdentifier: string) => Promise<void>;
}> = createContext(undefined);
