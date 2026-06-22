import {SwapperFactory} from "@atomiqlabs/sdk";
import {SolanaInitializerV2, SolanaInitializerType} from "@atomiqlabs/chain-solana";
import {StarknetInitializer, StarknetInitializerType} from "@atomiqlabs/chain-starknet";
import {
    AlpenInitializer,
    AlpenInitializerType,
    BotanixInitializer,
    BotanixInitializerType,
    CitreaInitializer,
    CitreaInitializerType, GoatInitializer, GoatInitializerType
} from "@atomiqlabs/chain-evm";

export const Factory = new SwapperFactory<readonly [
    SolanaInitializerType<"v2">,
    StarknetInitializerType,
    CitreaInitializerType,
    BotanixInitializerType,
    AlpenInitializerType,
    GoatInitializerType,
]>([
    SolanaInitializerV2,
    StarknetInitializer,
    CitreaInitializer,
    BotanixInitializer,
    AlpenInitializer,
    GoatInitializer,
] as const);

export const Tokens = Factory.Tokens;
export const TokenResolver = Factory.TokenResolver;
