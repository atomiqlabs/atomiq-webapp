import { FEConstants } from "../../../../FEConstants";
import {
  BitcoinNetwork,
  CoinselectAddressTypes,
  BitcoinWallet,
} from "@atomiqlabs/sdk";
import { NETWORK, TEST_NETWORK, Transaction } from "@scure/btc-signer";

const bitcoinNetwork =
  FEConstants.bitcoinNetwork === BitcoinNetwork.MAINNET
    ? NETWORK
    : TEST_NETWORK;

const feeMultiplier = 1.25;

export abstract class ExtensionBitcoinWallet extends BitcoinWallet {
  readonly wasAutomaticallyInitiated: boolean;

  constructor(wasAutomaticallyInitiated?: boolean) {
    super(
      FEConstants.bitcoinRpc,
      bitcoinNetwork,
      feeMultiplier,
      process.env.REACT_APP_OVERRIDE_BITCOIN_FEE == null
        ? null
        : parseInt(process.env.REACT_APP_OVERRIDE_BITCOIN_FEE),
    );
    this.wasAutomaticallyInitiated = wasAutomaticallyInitiated;
  }

  static loadState(): { name: string; data?: any } {
    const txt = localStorage.getItem("btc-wallet");
    if (txt == null) return null;
    try {
      return JSON.parse(localStorage.getItem("btc-wallet"));
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  static saveState(name: string, data?: any) {
    localStorage.setItem(
      "btc-wallet",
      JSON.stringify({
        name,
        data,
      }),
    );
  }

  static clearState() {
    localStorage.removeItem("btc-wallet");
  }

  protected abstract toBitcoinWalletAccounts(): {
    pubkey: string;
    address: string;
    addressType: CoinselectAddressTypes;
  }[];

  abstract sendTransaction(
    address: string,
    amount: bigint,
    feeRate?: number,
  ): Promise<string>;

  abstract getReceiveAddress(): string;
  abstract getBalance(): Promise<{
    confirmedBalance: bigint;
    unconfirmedBalance: bigint;
  }>;

  abstract getName(): string;
  abstract getIcon(): string;

  abstract onWalletChanged(
    cbk: (newWallet: ExtensionBitcoinWallet) => void,
  ): void;
  abstract offWalletChanged(
    cbk: (newWallet: ExtensionBitcoinWallet) => void,
  ): void;

  async getTransactionFee(
    address: string,
    amount: bigint,
    feeRate?: number,
  ): Promise<number> {
    const { psbt, fee } = await super._getPsbt(
      this.toBitcoinWalletAccounts(),
      address,
      Number(amount),
      feeRate,
    );
    if (psbt == null) return null;
    return fee;
  }

  async getFundedPsbtFee(basePsbt: Transaction, feeRate?: number) {
    const { psbt, fee } = await super._fundPsbt(
      this.toBitcoinWalletAccounts(),
      basePsbt,
      feeRate,
    );
    if (psbt == null) return null;
    return fee;
  }

  getSpendableBalance(
    basePsbt?: Transaction,
    feeRate?: number,
  ): Promise<{
    balance: bigint;
    feeRate: number;
    totalFee: number;
  }> {
    return this._getSpendableBalance(
      this.toBitcoinWalletAccounts(),
      basePsbt,
      feeRate,
    );
  }

  async fundPsbt(
    inputPsbt: Transaction,
    feeRate?: number,
  ): Promise<Transaction> {
    const { psbt } = await super._fundPsbt(
      this.toBitcoinWalletAccounts(),
      inputPsbt,
      feeRate,
    );

    if (psbt == null) {
      throw new Error("Not enough balance!");
    }

    return psbt;
  }
}
