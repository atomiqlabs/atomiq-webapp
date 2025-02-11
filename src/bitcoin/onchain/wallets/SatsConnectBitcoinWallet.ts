import * as BN from "bn.js";
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
import * as bitcoin from "bitcoinjs-lib";
import {BitcoinNetwork} from "@atomiqlabs/sdk";

const network = FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet;
const bitcoinNetwork = FEConstants.bitcoinNetwork===BitcoinNetwork.TESTNET ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

function identifyAddressType(address: string): CoinselectAddressTypes {
    const outputScript = bitcoin.address.toOutputScript(address, bitcoinNetwork);
    try {
        if(
            bitcoin.payments.p2pkh({
                output: outputScript,
                network: bitcoinNetwork
            }).address===address
        ) return "p2pkh";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2wpkh({
                output: outputScript,
                network: bitcoinNetwork
            }).address===address
        ) return "p2wpkh";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2tr({
                output: outputScript,
                network: bitcoinNetwork
            }).address===address
        ) return "p2tr";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2sh({
                output: outputScript,
                network: bitcoinNetwork
            }).address===address
        ) return "p2sh-p2wpkh";
    } catch (e) {console.error(e)}
    return null;
}

function _identifyAddressType(pubkey: string, address: string): CoinselectAddressTypes {
    const pubkeyBuffer = Buffer.from(pubkey, "hex");
    try {
        if(
            bitcoin.payments.p2pkh({
                pubkey: pubkeyBuffer,
                network: bitcoinNetwork
            }).address===address
        ) return "p2pkh";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2wpkh({
                pubkey: pubkeyBuffer,
                network: bitcoinNetwork
            }).address===address
        ) return "p2wpkh";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2tr({
                pubkey: pubkeyBuffer,
                network: bitcoinNetwork
            }).address===address
        ) return "p2tr";
    } catch (e) {console.error(e)}
    try {
        if(
            bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network: bitcoinNetwork}),
                network: bitcoinNetwork
            }).address===address
        ) return "p2sh-p2wpkh";
    } catch (e) {console.error(e)}
    return null;
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
        this.addressType = identifyAddressType(account.address);
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

    getBalance(): Promise<{ confirmedBalance: BN; unconfirmedBalance: BN }> {
        return super._getBalance(this.account.address);
    }

    getReceiveAddress(): string {
        return this.account.address;
    }

    getSpendableBalance(): Promise<{
        balance: BN,
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

    async getTransactionFee(address: string, amount: BN, feeRate?: number): Promise<number> {
        const {psbt, fee} = await super._getPsbt(this.toBitcoinWalletAccounts(), address, amount.toNumber(), feeRate);
        if(psbt==null) return null;
        return fee;
    }

    async sendTransaction(address: string, amount: BN, feeRate?: number): Promise<string> {
        const {psbt} = await super._getPsbt(this.toBitcoinWalletAccounts(), address, amount.toNumber(), feeRate);

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
                psbtBase64: psbt.toBase64(),
                broadcast: true,
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: psbt.txInputs.map((e, index) => index)
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
            const psbt = bitcoin.Psbt.fromBase64(psbtBase64);
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            txId = await super._sendTransaction(tx.toHex());
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