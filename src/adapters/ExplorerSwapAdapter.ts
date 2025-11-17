import { SwapDirection, SwapType } from '@atomiqlabs/sdk';
import { TokenResolver, Tokens } from '../FEConstants';

export interface ExplorerSwapData {
  chainId?: string;
  paymentHash: string;
  timestampInit: number;
  timestampFinish: number;
  type: 'LN' | 'CHAIN';
  direction: 'ToBTC' | 'FromBTC';
  kind: number;
  nonce: string;
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
  id: string;
  _tokenAmount: number;
  _rawAmount: number;
  _usdValue: number;
  _btcRawAmount: number;
  _btcAmount: number;
}

/**
 * Adapter to make explorer backend data compatible with TransactionEntry component
 *
 * Why this exists:
 * - SwapExplorer page receives raw data from the backend API with a different structure
 * - TransactionEntry component expects ISwap objects with methods like getInput(), getOutput(), etc.
 * - To reuse TransactionEntry and keep both History and SwapExplorer tables looking identical,
 *   this adapter transforms the backend data structure into an ISwap-compatible object
 * - Uses duck-typing (implements the methods TransactionEntry needs without strict type inheritance)
 *   to avoid complex TypeScript type conflicts
 */
export class ExplorerSwapAdapter {
  private data: ExplorerSwapData;
  public createdAt: number;

  constructor(data: ExplorerSwapData) {
    this.data = data;
    this.createdAt = data.timestampInit * 1000; // Convert to milliseconds
  }

  getInput() {
    const chainId = this.data.chainId ?? 'SOLANA';

    if (this.data.direction === 'ToBTC') {
      return {
        token: TokenResolver[chainId].getToken(this.data.token),
        amount: this.data.tokenAmount,
      };
    } else {
      return {
        token: this.data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN,
        amount: this.data.btcAmount || '???',
      };
    }
  }

  getOutput() {
    const chainId = this.data.chainId ?? 'SOLANA';

    if (this.data.direction === 'ToBTC') {
      return {
        token: this.data.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN,
        amount: this.data.btcAmount || '???',
      };
    } else {
      return {
        token: TokenResolver[chainId].getToken(this.data.token),
        amount: this.data.tokenAmount,
      };
    }
  }

  getInputTxId() {
    if (this.data.direction === 'ToBTC') {
      return this.data.txInit;
    } else {
      return this.data.type === 'CHAIN' ? this.data.btcTx : this.data.paymentHash;
    }
  }

  getOutputTxId() {
    if (this.data.direction === 'ToBTC') {
      return this.data.type === 'CHAIN' ? this.data.btcTx : this.data.paymentHash;
    } else {
      return this.data.txInit;
    }
  }

  getOutputAddress() {
    if (this.data.direction === 'ToBTC') {
      return this.data.type === 'CHAIN' ? this.data.btcAddress || 'Unknown' : 'Unknown';
    } else {
      return this.data.clientWallet;
    }
  }

  getDirection() {
    return this.data.direction === 'ToBTC' ? SwapDirection.TO_BTC : SwapDirection.FROM_BTC;
  }

  getId() {
    return this.data.id;
  }

  requiresAction() {
    // Explorer swaps don't require action from the viewer
    return false;
  }

  isSuccessful() {
    return this.data.success && this.data.finished;
  }

  isFailed() {
    return !this.data.success && this.data.finished;
  }

  isQuoteSoftExpired() {
    return false;
  }

  isInitiated() {
    return true;
  }

  getType() {
    // Return a generic type since we don't have enough info
    return SwapType.FROM_BTC;
  }

  // For instanceof checks in TransactionEntry
  // Returns the source/input address for the swap
  _getInitiator() {
    if (this.data.direction === 'ToBTC') {
      return this.data.clientWallet;
    } else {
      // For FROM_BTC swaps, return the BTC input address if available
      if (this.data.type === 'CHAIN' && this.data.btcInAddresses != null && this.data.btcInAddresses.length > 0) {
        return this.data.btcInAddresses[0];
      }
      return '';
    }
  }

  // Additional methods to support instanceof checks
  isRefundable() {
    return false;
  }

  isClaimable() {
    return false;
  }
}
