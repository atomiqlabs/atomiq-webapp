import {
  isIClaimableSwap,
  isIRefundableSwap,
  isSCToken,
  ISwap,
  IToBTCSwap,
  SwapDirection,
  toHumanReadableString,
  Token
} from '@atomiqlabs/sdk';
import { FEConstants, TokenResolver, Tokens } from '../FEConstants';

export interface TransactionEntryProps {
  id?: string;
  createdAt: number;
  requiresAction: boolean;

  // Input token info
  inputToken: Token;
  inputAmount: string;
  inputAddress: string;
  inputExplorer: string | null;
  inputTxId: string | undefined;

  // Output token info
  outputToken: Token;
  outputAmount: string;
  outputAddress: string;
  outputExplorer: string | null;
  outputTxId: string | undefined;

  // Status info
  isSuccessful: boolean;
  isFailed: boolean;
  isQuoteSoftExpired: boolean;
  refundable: boolean;
  claimable: boolean;
  direction: SwapDirection;

  // Pricing info
  usdValue?: string;
}

/**
 * Converts an ISwap object to TransactionEntryProps
 */
export function swapToProps(swap: ISwap): TransactionEntryProps {
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

  const refundable = isIRefundableSwap(swap) && swap.isRefundable();
  const claimable = isIClaimableSwap(swap) && swap.isClaimable();

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
 * Swap transaction data from the explorer API
 * Based on the SwapTransaction definition from atomiqlabs-swaps-indexer API
 */
export interface ExplorerSwapData {
  id: string;
  paymentHash: string;
  chainId: string;
  timestampInit: number;
  timestampFinish: number;
  type: 'LN' | 'CHAIN';
  direction: 'ToBTC' | 'FromBTC';
  kind: number;
  nonce: string;
  sequence: string;
  lpWallet: string;
  clientWallet: string;
  token: string;
  tokenName: string;
  tokenAmount: string;
  rawAmount: string;
  txInit: string;
  txFinish: string;
  btcTx: string;
  btcOutput?: number;
  btcAddress?: string;
  btcAmount?: string;
  btcRawAmount?: string;
  btcInAddresses?: string[];
  success: boolean;
  finished: boolean;
  price: string;
  usdValue: string;
  _ts: number;
}

/**
 * Converts an ExplorerSwapData object (from the explorer API) to TransactionEntryProps
 */
export function explorerSwapToProps(data: ExplorerSwapData): TransactionEntryProps {
  const direction = data.direction === 'ToBTC' ? SwapDirection.TO_BTC : SwapDirection.FROM_BTC;

  // Determine input/output based on direction
  let inputToken, inputAmount, inputAddress, inputTxId;
  let outputToken, outputAmount, outputAddress, outputTxId;

  if (data.direction === 'ToBTC') {
    // Input is smart chain token
    inputToken = TokenResolver[data.chainId].getToken(data.token);
    inputAmount = toHumanReadableString(BigInt(data.rawAmount), inputToken);
    inputAddress = data.clientWallet;
    inputTxId = data.txInit;

    // Output is BTC
    outputToken = data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
    outputAmount = data.btcAmount || '???';
    outputAddress = data.type === 'CHAIN' ? data.btcAddress : null;
    outputTxId = data.type === 'CHAIN' ? data.btcTx : data.paymentHash;
  } else {
    // Input is BTC
    inputToken = data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
    inputAmount = data.btcAmount || '???';
    inputAddress =
      data.type === 'CHAIN' && data.btcInAddresses != null && data.btcInAddresses.length > 0
        ? data.btcInAddresses[0]
        : null;
    inputTxId = data.type === 'CHAIN' ? data.btcTx : data.paymentHash;

    // Output is smart chain token
    outputToken = TokenResolver[data.chainId].getToken(data.token);
    outputAmount = toHumanReadableString(BigInt(data.rawAmount), outputToken);
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
    createdAt: data.timestampInit * 1000, // Convert to milliseconds
    requiresAction: false, // Explorer swaps don't require action from the viewer

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

    usdValue: data.usdValue
  };
}
