import {
    Address,
    AddressPurpose,
    BitcoinNetworkType,
    GetAddressResponse,
    getCapabilities,
    getAddress,
    signTransaction
} from "sats-connect";
import {BitcoinWallet} from "../BitcoinWallet";
import {FEConstants} from "../../../FEConstants";
import {CoinselectAddressTypes} from "../coinselect2/utils";
import {BitcoinNetwork} from "@atomiqlabs/sdk";
import {BTC_NETWORK} from "@scure/btc-signer/utils";
import {Transaction, Address as AddressParser} from "@scure/btc-signer";

const network = FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet;

function identifyAddressType(address: string, network: BTC_NETWORK): CoinselectAddressTypes {
    switch(AddressParser(network).decode(address).type) {
        case "pkh":
            return "p2pkh";
        case "wpkh":
            return "p2wpkh";
        case "tr":
            return "p2tr";
        case "sh":
            return "p2sh-p2wpkh"
        default:
            return null;
    }
}

export class SatsConnectBitcoinWallet extends BitcoinWallet {

    readonly account: Address;
    readonly addressType: CoinselectAddressTypes;

    readonly walletName: string;
    readonly iconUrl: string;

    constructor(account: Address, walletName: string, iconUrl: string, wasAutomaticallyConnected?: boolean) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.walletName = walletName;
        this.iconUrl = iconUrl;
        this.addressType = identifyAddressType(account.address, this.network);
    }

    static async isInstalled(): Promise<boolean> {
        let success = false;
        for(let i=0;i<10;i++) {
            try {
                await getCapabilities({
                    onFinish(response) {
                        console.log("Capabilities: ", response);
                    },
                    onCancel() {
                        console.log("User cancelled!");
                    },
                    payload: {
                        network: {
                            type: network
                        },
                    },
                });
                success = true;
                break;
            } catch (e) {
                success = false;
                // console.error(e);
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }
        return success;
    }

    static async init(walletName: string, iconUrl: string, constructor: new (account: Address, walletName: string, iconUrl: string, wasAutomaticallyConnected?: boolean) => SatsConnectBitcoinWallet, _data?: any): Promise<SatsConnectBitcoinWallet> {
        if(_data?.account!=null) {
            const data: {
                account: Address
            } = _data;

            return new constructor(data.account, walletName, iconUrl, _data?.multichainConnected);
        }

        let result: GetAddressResponse = null;
        let cancelled: boolean = false;
        await getAddress({
            payload: {
                purposes: [AddressPurpose.Payment],
                message: "Connect your Bitcoin wallet to atomiq.exchange",
                network: {
                    type: network
                },
            },
            onFinish: (_result: GetAddressResponse) => {
                result = _result;
            },
            onCancel: () => {cancelled = true}
        });

        if(cancelled) throw new Error("User declined the connection request");

        if(result==null) throw new Error("Xverse bitcoin wallet not found");
        const accounts: Address[] = result.addresses;
        console.log("Loaded wallet accounts: ", accounts);
        const paymentAccounts = accounts.filter(e => e.purpose===AddressPurpose.Payment);
        if(paymentAccounts.length===0) throw new Error("No valid payment account found");

        BitcoinWallet.saveState(walletName, {
            account: paymentAccounts[0],
            multichainConnected: _data?.multichainConnected
        });

        return new constructor(paymentAccounts[0], walletName, iconUrl);
    }

    getBalance(): Promise<{ confirmedBalance: bigint; unconfirmedBalance: bigint }> {
        return super._getBalance(this.account.address);
    }

    getReceiveAddress(): string {
        return this.account.address;
    }

    getSpendableBalance(): Promise<{
        balance: bigint,
        feeRate: number,
        totalFee: number
    }> {
        return this._getSpendableBalance(this.toBitcoinWalletAccounts());
    }

    //Workaround for undefined BigInt() convertor in es2020
    toBigInt(num: number): bigint {
        let sum: bigint = 0n;
        for(let i=0n;i<53n;i++) {
            if((num & 0b1)===0b1) {
                sum |= 1n << i;
            }
            num = Math.floor(num/2);
        }
        return sum;
    }

    private toBitcoinWalletAccounts(): {pubkey: string, address: string, addressType: CoinselectAddressTypes}[] {
        return [{
            pubkey: this.account.publicKey, address: this.account.address, addressType: this.addressType
        }];
    }

    async getTransactionFee(address: string, amount: bigint, feeRate?: number): Promise<number> {
        const {psbt, fee} = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if(psbt==null) return null;
        return fee;
    }

    async sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string> {
        const {psbt} = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);

        if(psbt==null) {
            throw new Error("Not enough balance!");
        }

        let txId: string = null;
        let psbtBase64: string = null;
        let cancelled: boolean = false;
        await signTransaction({
            payload: {
                network: {
                    type: network
                },
                message: "Send a swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(2)).toString("base64"),
                broadcast: true,
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: Array.from({length: psbt.inputsLength}, (_, i) => i)
                }]
            },
            onFinish: (resp: {txId?: string, psbtBase64?: string}) => {
                console.log("TX signed: ", resp);
                txId = resp.txId;
                psbtBase64 = resp.psbtBase64;
            },
            onCancel: () => {cancelled = true}
        });

        if(cancelled) throw new Error("User declined the transaction request");

        if(txId==null) {
            if(psbtBase64==null) throw new Error("Transaction not properly signed by the wallet!");
            const psbt = Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
            psbt.finalize();
            const txHex = Buffer.from(psbt.extract()).toString("hex");
            txId = await super._sendTransaction(txHex);
        }
        console.log("signTransaction returned!");

        return txId;
    }

    getName(): string {
        return this.walletName;
    }

    getIcon(): string {
        return this.iconUrl;
    }

    offWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void {
    }

    onWalletChanged(cbk: (newWallet: BitcoinWallet) => void): void {
    }

}