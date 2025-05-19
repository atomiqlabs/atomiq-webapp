import {
    Address,
    AddressPurpose,
    BitcoinNetworkType,
    GetAddressResponse,
    getCapabilities,
    getAddress,
    signTransaction
} from "sats-connect";
import {ExtensionBitcoinWallet} from "./ExtensionBitcoinWallet";
import {FEConstants} from "../../../../FEConstants";
import {BitcoinNetwork, CoinselectAddressTypes} from "@atomiqlabs/sdk";
import {BTC_NETWORK} from "@scure/btc-signer/utils";
import {Transaction, Address as AddressParser} from "@scure/btc-signer";

const network = FEConstants.bitcoinNetwork===BitcoinNetwork.MAINNET ? BitcoinNetworkType.Mainnet : FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET4 ? "Testnet4" : BitcoinNetworkType.Testnet;

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

export class SatsConnectBitcoinWallet extends ExtensionBitcoinWallet {

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
                    onFinish() {},
                    onCancel() {
                        console.error("User cancelled!");
                    },
                    payload: {
                        network: {
                            type: network as any
                        },
                    },
                });
                success = true;
                break;
            } catch (e) {
                success = false;
                // console.error(e);
                await new Promise((resolve) => setTimeout(resolve, 100));
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
                    type: network as any
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
        console.log(walletName+"BitcoinWallet: Loaded wallet accounts: ", accounts);
        const paymentAccounts = accounts.filter(e => e.purpose===AddressPurpose.Payment);
        if(paymentAccounts.length===0) throw new Error("No valid payment account found");

        ExtensionBitcoinWallet.saveState(walletName, {
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

    protected toBitcoinWalletAccounts(): {pubkey: string, address: string, addressType: CoinselectAddressTypes}[] {
        return [{
            pubkey: this.account.publicKey, address: this.account.address, addressType: this.addressType
        }];
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
                    type: network as any
                },
                message: "Send a swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                broadcast: true,
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: Array.from({length: psbt.inputsLength}, (_, i) => i)
                }]
            },
            onFinish: (resp: {txId?: string, psbtBase64?: string}) => {
                console.log(this.getName()+"BitcoinWallet: transaction signed: ", resp);
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

        return txId;
    }

    getName(): string {
        return this.walletName;
    }

    getIcon(): string {
        return this.iconUrl;
    }

    offWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
    }

    onWalletChanged(cbk: (newWallet: ExtensionBitcoinWallet) => void): void {
    }

    async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
        let psbtBase64: string = null;
        let cancelled: boolean = false;
        await signTransaction({
            payload: {
                network: {
                    type: network as any
                },
                message: "Send a swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: signInputs
                }]
            },
            onFinish: (resp: {txId?: string, psbtBase64?: string}) => {
                console.log(this.getName()+"BitcoinWallet: transaction signed: ", resp);
                psbtBase64 = resp.psbtBase64;
            },
            onCancel: () => {cancelled = true}
        });

        if(cancelled) throw new Error("User declined the transaction request");

        if(psbtBase64==null) throw new Error("Transaction not properly signed by the wallet!");

        return Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
    }

}