import { ExtensionBitcoinWallet } from "./base/ExtensionBitcoinWallet";
import * as EventEmitter from "events";
import { Address, OutScript, Transaction } from "@scure/btc-signer";
import { CoinselectAddressTypes } from "@atomiqlabs/sdk";
import { BitcoinWalletNonSeparated } from "./base/BitcoinWalletNonSeparated";

const addressTypePriorities = {
  p2tr: 0,
  p2wpkh: 1,
  p2sh: 2,
  p2pkh: 3,
};

const ADDRESS_FORMAT_MAP: { [key: string]: CoinselectAddressTypes } = {
  p2tr: "p2tr",
  p2wpkh: "p2wpkh",
  p2sh: "p2sh-p2wpkh",
  p2pkh: "p2pkh",
};

type PhantomBtcAccount = {
  address: string;
  addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
  publicKey: string;
  purpose: "payment" | "ordinals";
};

type PhantomBtcProvider = {
  requestAccounts: () => Promise<PhantomBtcAccount[]>;
  signMessage: (
    message: Uint8Array,
    address: string,
  ) => Promise<{ signature: Uint8Array }>;
  signPSBT: (
    psbtHex: Uint8Array,
    options: {
      inputsToSign: {
        sigHash?: number | undefined;
        address: string;
        signingIndexes: number[];
      }[];
    },
  ) => Promise<string>;
  isPhantom?: boolean;
} & EventEmitter;

function deduplicateAccounts(
  accounts: PhantomBtcAccount[],
): PhantomBtcAccount[] {
  const accountMap: { [address: string]: PhantomBtcAccount } = {};
  accounts.forEach((acc) => {
    //Prefer payment accounts
    if (
      accountMap[acc.address] != null &&
      accountMap[acc.address].purpose === "payment"
    )
      return;
    accountMap[acc.address] = acc;
  });
  return Object.keys(accountMap).map((address) => accountMap[address]);
}

function getPaymentAccount(accounts: PhantomBtcAccount[]): PhantomBtcAccount {
  const paymentAccounts = accounts.filter((e) => e.purpose === "payment");
  if (paymentAccounts.length === 0)
    throw new Error("No valid payment account found");
  paymentAccounts.sort(
    (a, b) =>
      addressTypePriorities[a.addressType] -
      addressTypePriorities[b.addressType],
  );
  return paymentAccounts[0];
}

const events = new EventEmitter();
const provider: PhantomBtcProvider = (window as any)?.phantom?.bitcoin;

let currentAccount: PhantomBtcAccount = null;
let ignoreAccountChange: boolean;

if (provider != null)
  provider.on("accountsChanged", (accounts: PhantomBtcAccount[]) => {
    console.log(
      "PhantomBitcoinWallet: accountsChanged, ignore: " +
        ignoreAccountChange +
        " accounts: ",
      accounts,
    );
    if (ignoreAccountChange) return;
    let btcWalletState = ExtensionBitcoinWallet.loadState();
    if (
      btcWalletState == null ||
      btcWalletState.name !== PhantomBitcoinWallet.walletName
    )
      return;
    if (accounts != null && accounts.length > 0) {
      const paymentAccount: PhantomBtcAccount = getPaymentAccount(accounts);
      if (
        currentAccount != null &&
        paymentAccount.address == currentAccount.address
      )
        return;

      currentAccount = paymentAccount;

      ExtensionBitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
        accounts,
      });
      events.emit(
        "newWallet",
        new PhantomBitcoinWallet(
          accounts,
          btcWalletState.data.multichainConnected,
        ),
      );
    } else {
      events.emit("newWallet", null);
    }
  });

export class PhantomBitcoinWallet extends BitcoinWalletNonSeparated {
  static installUrl: string = "https://phantom.com/download";
  static iconUrl: string = "wallets/btc/phantom.png";
  static walletName: string = "Phantom";

  readonly accounts: PhantomBtcAccount[];
  readonly account: PhantomBtcAccount;

  constructor(
    accounts: PhantomBtcAccount[],
    wasAutomaticallyConnected: boolean,
  ) {
    super(wasAutomaticallyConnected);
    this.accounts = deduplicateAccounts(accounts);
    this.account = getPaymentAccount(accounts);
  }

  static isInstalled(): Promise<boolean> {
    const isPhantomInstalled = (window as any)?.phantom?.bitcoin?.isPhantom;
    return Promise.resolve(isPhantomInstalled);
  }

  static async init(_data?: any): Promise<PhantomBitcoinWallet> {
    if (_data?.accounts != null || _data?.account != null) {
      const data: {
        account: PhantomBtcAccount;
      } = _data;

      await new Promise((resolve) => setTimeout(resolve, 750));
    }

    if (provider == null) throw new Error("Phantom bitcoin wallet not found");
    if (provider.isPhantom == null)
      throw new Error("Provider is not Phantom wallet");
    ignoreAccountChange = true;
    let accounts: PhantomBtcAccount[];
    try {
      accounts = await provider.requestAccounts();
    } catch (e) {
      ignoreAccountChange = false;
      throw e;
    }
    ignoreAccountChange = false;
    const paymentAccount: PhantomBtcAccount = getPaymentAccount(accounts);
    currentAccount = paymentAccount;
    ExtensionBitcoinWallet.saveState(PhantomBitcoinWallet.walletName, {
      accounts,
      multichainConnected: _data?.multichainConnected,
    });
    return new PhantomBitcoinWallet(accounts, _data?.multichainConnected);
  }

  protected _isOrdinalsAddress(address: string): boolean {
    const acc = this.accounts.find((val) => val.address === address);
    return acc?.purpose === "ordinals";
  }

  async getBalance(): Promise<{
    confirmedBalance: bigint;
    unconfirmedBalance: bigint;
  }> {
    const balances = await Promise.all(
      this.accounts.map((acc) => super._getBalance(acc.address)),
    );
    return balances.reduce(
      (prevValue, currValue) => {
        return {
          confirmedBalance:
            prevValue.confirmedBalance + currValue.confirmedBalance,
          unconfirmedBalance:
            prevValue.confirmedBalance + currValue.unconfirmedBalance,
        };
      },
      { confirmedBalance: 0n, unconfirmedBalance: 0n },
    );
  }

  getReceiveAddress(): string {
    return this.account.address;
  }

  protected toBitcoinWalletAccounts(): {
    pubkey: string;
    address: string;
    addressType: CoinselectAddressTypes;
  }[] {
    return this.accounts.map((acc) => {
      return {
        pubkey: acc.publicKey,
        address: acc.address,
        addressType: ADDRESS_FORMAT_MAP[this.account.addressType],
      };
    });
  }

  async sendTransaction(
    address: string,
    amount: bigint,
    feeRate?: number,
  ): Promise<string> {
    const { psbt, inputAddressIndexes } = await super._getPsbt(
      this.toBitcoinWalletAccounts(),
      address,
      Number(amount),
      feeRate,
    );

    if (psbt == null) {
      throw new Error("Not enough balance!");
    }

    const psbtBuffer = psbt.toPSBT(0);

    const resultSignedPsbtHex = await provider.signPSBT(psbtBuffer, {
      inputsToSign: Object.keys(inputAddressIndexes).map((address) => {
        return {
          sigHash: 0x01,
          address,
          signingIndexes: inputAddressIndexes[address],
        };
      }),
    });

    const signedPsbt = Transaction.fromPSBT(
      Buffer.from(resultSignedPsbtHex, "hex"),
    );
    signedPsbt.finalize();

    const btcTxHex = Buffer.from(signedPsbt.extract()).toString("hex");
    return await super._sendTransaction(btcTxHex);
  }

  getName(): string {
    return PhantomBitcoinWallet.walletName;
  }

  getIcon(): string {
    return PhantomBitcoinWallet.iconUrl;
  }

  offWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
    events.off("newWallet", cbk);
  }

  onWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
    events.on("newWallet", cbk);
  }

  async signPsbt(
    psbt: Transaction,
    signInputs: number[],
  ): Promise<Transaction> {
    const psbtBuffer = psbt.toPSBT(0);

    const inputAddressIndexes: { [address: string]: number[] } = {};
    signInputs.forEach((index) => {
      const input = psbt.getInput(index);
      const prevOutScript: Uint8Array = input.witnessUtxo
        ? input.witnessUtxo.script
        : input.nonWitnessUtxo.outputs[input.index].script;
      const address = Address(this.network).encode(
        OutScript.decode(prevOutScript),
      );
      inputAddressIndexes[address] ??= [];
      inputAddressIndexes[address].push(index);
    });

    const resultSignedPsbtHex = await provider.signPSBT(psbtBuffer, {
      inputsToSign: Object.keys(inputAddressIndexes).map((address) => {
        return {
          sigHash: 0x01,
          address,
          signingIndexes: inputAddressIndexes[address],
        };
      }),
    });

    return Transaction.fromPSBT(Buffer.from(resultSignedPsbtHex, "hex"));
  }
}
