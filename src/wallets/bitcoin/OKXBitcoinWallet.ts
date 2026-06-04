import {UnisatLikeBitcoinWallet} from "./base/UnisatLikeBitcoinWallet";
import {BitcoinNetwork} from "@atomiqlabs/sdk";
import {Transaction} from "@scure/btc-signer";

const getProvider = () => (window as any)?.okxwallet?.bitcoin;

export class OKXBitcoinWallet extends UnisatLikeBitcoinWallet {

  static installUrl: string = "https://web3.okx.com/download";
  static iconUrl: string = "wallets/btc/okx.png";
  static walletName: string = "OKX Wallet";

  static async isInstalled(): Promise<boolean> {
    return UnisatLikeBitcoinWallet._isInstalled(
      getProvider,
      OKXBitcoinWallet,
      OKXBitcoinWallet.walletName
    );
  }

  static async init(_data?: any): Promise<OKXBitcoinWallet> {
    return UnisatLikeBitcoinWallet._init(
      getProvider,
      OKXBitcoinWallet,
      OKXBitcoinWallet.walletName,
      _data
    );
  }

  getIcon(): string {
    return OKXBitcoinWallet.iconUrl;
  }

  getName(): string {
    return OKXBitcoinWallet.walletName;
  }

  //Special PSBT handling for non-taproot addresses for OKX wallet
  async sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string> {
    const { psbt } = await super._getPsbt(
        this.toBitcoinWalletAccounts(),
        address,
        Number(amount),
        feeRate
    );

    if (psbt == null) {
      throw new Error('Not enough balance!');
    }

    const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString('hex'), {
      autoFinalized: true,
      toSignInputs: Array.from({ length: psbt.inputsLength }, (_, i) => {
        return {
          index: i,
          address: this.account.address,
          publicKey: this.addressType==="p2tr" ? this.account.publicKey : undefined,
        };
      }),
    });

    if (psbtHex == null) throw new Error('User declined the transaction request');

    const finalizedPsbt = Transaction.fromPSBT(Buffer.from(psbtHex, 'hex'));
    const txHex = Buffer.from(finalizedPsbt.extract()).toString('hex');
    const txId = await super._sendTransaction(txHex);

    return txId;
  }

  //Special PSBT handling for non-taproot addresses for OKX wallet
  async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
    const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString('hex'), {
      autoFinalized: false,
      toSignInputs: signInputs.map((i) => {
        return {
          index: i,
          address: this.account.address,
          publicKey: this.addressType==="p2tr" ? this.account.publicKey : undefined,
        };
      }),
    });

    if (psbtHex == null) throw new Error('Transaction not properly signed by the wallet!');

    return Transaction.fromPSBT(Buffer.from(psbtHex, 'hex'));
  }

}
