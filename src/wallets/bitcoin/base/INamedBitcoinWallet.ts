import {IBitcoinWallet} from "@atomiqlabs/sdk";

export interface INamedBitcoinWallet extends IBitcoinWallet {
  getName(): string;
  getIcon(): string;
  isOnlyInput?(): boolean;
}
