import { isSCToken, SwapDirection } from '@atomiqlabs/sdk';
import { FEConstants, TokenResolver, Tokens } from '../FEConstants';
/**
 * Converts an ISwap object to TransactionEntryProps
 */
export function swapToProps(swap) {
    const input = swap.getInput();
    const output = swap.getOutput();
    const inputExplorer = isSCToken(input.token)
        ? FEConstants.blockExplorers[input.token.chainId]
        : !input.token.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    const outputExplorer = isSCToken(output.token)
        ? FEConstants.blockExplorers[output.token.chainId]
        : !output.token.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    const txIdInput = swap.getInputTxId();
    const txIdOutput = swap.getOutputTxId();
    const inputAddress = swap._getInitiator ? swap._getInitiator() : '';
    const outputAddress = swap.getOutputAddress();
    const refundable = swap.getDirection() === SwapDirection.TO_BTC && swap.isRefundable();
    const claimable = swap.getDirection() === SwapDirection.FROM_BTC && swap.isClaimable();
    return {
        id: swap.getId(),
        createdAt: swap.createdAt,
        requiresAction: swap.requiresAction(),
        inputToken: input.token,
        inputAmount: input.amount,
        inputAddress,
        inputExplorer,
        inputTxId: txIdInput,
        outputToken: output.token,
        outputAmount: output.amount,
        outputAddress,
        outputExplorer,
        outputTxId: txIdOutput,
        isSuccessful: swap.isSuccessful(),
        isFailed: swap.isFailed(),
        isQuoteSoftExpired: swap.isQuoteSoftExpired(),
        refundable,
        claimable,
        direction: swap.getDirection(),
    };
}
/**
 * Converts an ExplorerSwapData object (from the explorer API) to TransactionEntryProps
 */
export function explorerSwapToProps(data) {
    const direction = data.direction === 'ToBTC' ? SwapDirection.TO_BTC : SwapDirection.FROM_BTC;
    // Determine input/output based on direction
    let inputToken, inputAmount, inputAddress, inputTxId;
    let outputToken, outputAmount, outputAddress, outputTxId;
    if (data.direction === 'ToBTC') {
        // Input is smart chain token
        inputToken = TokenResolver[data.chainId].getToken(data.token);
        inputAmount = data.tokenAmount;
        inputAddress = data.clientWallet;
        inputTxId = data.txInit;
        // Output is BTC
        outputToken = data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
        outputAmount = data.btcAmount || '???';
        outputAddress = data.type === 'CHAIN' ? data.btcAddress || 'Unknown' : 'Unknown';
        outputTxId = data.type === 'CHAIN' ? data.btcTx : data.paymentHash;
    }
    else {
        // Input is BTC
        inputToken = data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
        inputAmount = data.btcAmount || '???';
        inputAddress =
            data.type === 'CHAIN' && data.btcInAddresses != null && data.btcInAddresses.length > 0
                ? data.btcInAddresses[0]
                : '';
        inputTxId = data.type === 'CHAIN' ? data.btcTx : data.paymentHash;
        // Output is smart chain token
        outputToken = TokenResolver[data.chainId].getToken(data.token);
        outputAmount = data.tokenAmount;
        outputAddress = data.clientWallet;
        outputTxId = data.txInit;
    }
    const inputExplorer = isSCToken(inputToken)
        ? FEConstants.blockExplorers[inputToken.chainId]
        : !inputToken.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    const outputExplorer = isSCToken(outputToken)
        ? FEConstants.blockExplorers[outputToken.chainId]
        : !outputToken.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    return {
        id: data.id,
        createdAt: data.timestampInit * 1000,
        requiresAction: false,
        inputToken,
        inputAmount,
        inputAddress,
        inputExplorer,
        inputTxId,
        outputToken,
        outputAmount,
        outputAddress,
        outputExplorer,
        outputTxId,
        isSuccessful: data.success && data.finished,
        isFailed: !data.success && data.finished,
        isQuoteSoftExpired: false,
        refundable: false,
        claimable: false,
        direction,
    };
}
