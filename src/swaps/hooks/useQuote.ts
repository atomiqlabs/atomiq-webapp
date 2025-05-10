import {useContext} from "react";
import {
    BitcoinNetwork, fromHumanReadableString,
    isBtcToken,
    isSCToken,
    ISwap,
    LNURLPay,
    LNURLWithdraw,
    Swapper,
    Token
} from "@atomiqlabs/sdk";
import {SwapsContext} from "../context/SwapsContext";
import {useWithAwait} from "../../utils/hooks/useWithAwait";
import {useChainForCurrency} from "../../wallets/hooks/useChainForCurrency";
import {Address, NETWORK, TEST_NETWORK} from "@scure/btc-signer";
import {FEConstants} from "../../FEConstants";
import * as randomBytes from "randombytes";
import BigNumber from "bignumber.js";
import {fromHumanReadable} from "../../tokens/Tokens";

const btcFeeMaxOffset = 3;
const btcFeeMaxMultiple = 1.5;

const RANDOM_BTC_ADDRESS = Address(FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? TEST_NETWORK : NETWORK).encode({
    type: "wsh",
    hash: randomBytes(32)
});

function getRandomAddress(swapper: Swapper<any>, token: Token): string {
    if(isSCToken(token)) {
        return swapper.chains[token.chainId].chainInterface.randomAddress();
    } else if(isBtcToken(token) && !token.lightning) {
        return RANDOM_BTC_ADDRESS;
    }
    return null;
}

export function useQuote(
    amount: BigNumber,
    exactIn: boolean,
    inToken: Token<any>,
    outToken: Token<any>,
    address: string | LNURLWithdraw | LNURLPay,
    gasDropAmount?: bigint,
    btcFeeRate?: number
): [() => void, ISwap, boolean, any] {
    const {swapper} = useContext(SwapsContext);

    const inputChain = useChainForCurrency(inToken);
    const inputAddress = inputChain?.wallet?.address ?? (isBtcToken(inToken) && inToken.lightning ? address : null);

    const [quote, loading, error, refresh] = useWithAwait(
        async (
            swapper: Swapper<any>, amount: BigNumber, exactIn: boolean,
            inToken: Token, outToken: Token,
            inputAddress: string | LNURLWithdraw | LNURLPay, outputAddress: string | LNURLWithdraw | LNURLPay,
            gasDropAmount: bigint, btcFeeRate: number
        ) => {
            console.log("useQuote(): amount: "+amount+" exactIn: "+exactIn+" inToken: "+inToken?.ticker+" outToken: "+outToken?.ticker+" inputAddr: "+inputAddress+" outputAddr: "+outputAddress+" gasDropAmount: "+gasDropAmount+" btcFeeRate: "+btcFeeRate)
            if(swapper==null || inToken==null || outToken==null || amount==null) return null;
            const rawAmount = fromHumanReadable(amount, exactIn ? inToken : outToken);
            return await swapper.create(
                inToken, outToken, rawAmount, exactIn,
                inputAddress as any ?? getRandomAddress(swapper, inToken),
                outputAddress as any ?? getRandomAddress(swapper, outToken),
                {
                    gasAmount: gasDropAmount,
                    maxAllowedNetworkFeeRate: btcFeeRate==null ? null : btcFeeMaxOffset + (btcFeeRate * btcFeeMaxMultiple)
                }
            );
        },
        [swapper, amount, exactIn, inToken, outToken, inputAddress, address, gasDropAmount, btcFeeRate]
    );

    return [refresh, quote, loading, error];
}
