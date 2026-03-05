import {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";
import {INamedBitcoinWallet} from "./base/INamedBitcoinWallet";

export class InternalBitcoinWebwallet extends SingleAddressBitcoinWallet implements INamedBitcoinWallet {

  static walletName: string = "Webwallet";

  getIcon(): string {
    return "";
  }

  getName(): string {
    return InternalBitcoinWebwallet.walletName;
  }

  isOnlyInput(): boolean {
    return true;
  }

}
