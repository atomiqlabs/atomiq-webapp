import { AddressPurpose, BitcoinNetworkType, getCapabilities, getAddress, signTransaction } from "sats-connect";
import { BitcoinWallet } from "../BitcoinWallet";
import { FEConstants } from "../../../FEConstants";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
import { Transaction, Address as AddressParser } from "@scure/btc-signer";
const network = FEConstants.bitcoinNetwork === BitcoinNetwork.TESTNET ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet;
function identifyAddressType(address, network) {
    switch (AddressParser(network).decode(address).type) {
        case "pkh":
            return "p2pkh";
        case "wpkh":
            return "p2wpkh";
        case "tr":
            return "p2tr";
        case "sh":
            return "p2sh-p2wpkh";
        default:
            return null;
    }
}
export class SatsConnectBitcoinWallet extends BitcoinWallet {
    constructor(account, walletName, iconUrl, wasAutomaticallyConnected) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.walletName = walletName;
        this.iconUrl = iconUrl;
        this.addressType = identifyAddressType(account.address, this.network);
    }
    static async isInstalled() {
        let success = false;
        for (let i = 0; i < 10; i++) {
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
            }
            catch (e) {
                success = false;
                // console.error(e);
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return success;
    }
    static async init(walletName, iconUrl, constructor, _data) {
        if (_data?.account != null) {
            const data = _data;
            return new constructor(data.account, walletName, iconUrl, _data?.multichainConnected);
        }
        let result = null;
        let cancelled = false;
        await getAddress({
            payload: {
                purposes: [AddressPurpose.Payment],
                message: "Connect your Bitcoin wallet to atomiq.exchange",
                network: {
                    type: network
                },
            },
            onFinish: (_result) => {
                result = _result;
            },
            onCancel: () => { cancelled = true; }
        });
        if (cancelled)
            throw new Error("User declined the connection request");
        if (result == null)
            throw new Error("Xverse bitcoin wallet not found");
        const accounts = result.addresses;
        console.log("Loaded wallet accounts: ", accounts);
        const paymentAccounts = accounts.filter(e => e.purpose === AddressPurpose.Payment);
        if (paymentAccounts.length === 0)
            throw new Error("No valid payment account found");
        BitcoinWallet.saveState(walletName, {
            account: paymentAccounts[0],
            multichainConnected: _data?.multichainConnected
        });
        return new constructor(paymentAccounts[0], walletName, iconUrl);
    }
    getBalance() {
        return super._getBalance(this.account.address);
    }
    getReceiveAddress() {
        return this.account.address;
    }
    toBitcoinWalletAccounts() {
        return [{
                pubkey: this.account.publicKey, address: this.account.address, addressType: this.addressType
            }];
    }
    async sendTransaction(address, amount, feeRate) {
        const { psbt } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if (psbt == null) {
            throw new Error("Not enough balance!");
        }
        let txId = null;
        let psbtBase64 = null;
        let cancelled = false;
        await signTransaction({
            payload: {
                network: {
                    type: network
                },
                message: "Send a swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                broadcast: true,
                inputsToSign: [{
                        address: this.account.address,
                        signingIndexes: Array.from({ length: psbt.inputsLength }, (_, i) => i)
                    }]
            },
            onFinish: (resp) => {
                console.log("TX signed: ", resp);
                txId = resp.txId;
                psbtBase64 = resp.psbtBase64;
            },
            onCancel: () => { cancelled = true; }
        });
        if (cancelled)
            throw new Error("User declined the transaction request");
        if (txId == null) {
            if (psbtBase64 == null)
                throw new Error("Transaction not properly signed by the wallet!");
            const psbt = Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
            psbt.finalize();
            const txHex = Buffer.from(psbt.extract()).toString("hex");
            txId = await super._sendTransaction(txHex);
        }
        console.log("signTransaction returned!");
        return txId;
    }
    getName() {
        return this.walletName;
    }
    getIcon() {
        return this.iconUrl;
    }
    offWalletChanged(cbk) {
    }
    onWalletChanged(cbk) {
    }
    async signPsbt(psbt, signInputs) {
        let psbtBase64 = null;
        let cancelled = false;
        await signTransaction({
            payload: {
                network: {
                    type: network
                },
                message: "Send a swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                inputsToSign: [{
                        address: this.account.address,
                        signingIndexes: signInputs
                    }]
            },
            onFinish: (resp) => {
                console.log("TX signed: ", resp);
                psbtBase64 = resp.psbtBase64;
            },
            onCancel: () => { cancelled = true; }
        });
        if (cancelled)
            throw new Error("User declined the transaction request");
        if (psbtBase64 == null)
            throw new Error("Transaction not properly signed by the wallet!");
        return Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
    }
}
