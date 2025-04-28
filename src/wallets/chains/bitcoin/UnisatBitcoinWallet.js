import { BitcoinWallet } from "./base/BitcoinWallet";
import { Transaction, Address as AddressParser } from "@scure/btc-signer";
import { BitcoinWalletNonSeparated } from "./base/BitcoinWalletNonSeparated";
import * as EventEmitter from "events";
const events = new EventEmitter();
const getProvider = () => window?.unisat;
let currentAccount = null;
let ignoreAccountChange;
let listenerSet = false;
function setAccountChangeListener() {
    if (listenerSet)
        return;
    listenerSet = true;
    getProvider().on("accountsChanged", (accounts) => {
        console.log("UnisatBitcoinWallet: accountsChanged, ignore: " + ignoreAccountChange + " accounts: ", accounts);
        if (ignoreAccountChange)
            return;
        let btcWalletState = BitcoinWallet.loadState();
        if (btcWalletState == null || btcWalletState.name !== UnisatBitcoinWallet.walletName)
            return;
        if (accounts != null && accounts.length > 0) {
            if (currentAccount != null && accounts[0] == currentAccount)
                return;
            currentAccount = accounts[0];
            BitcoinWallet.saveState(UnisatBitcoinWallet.walletName, {
                account: accounts[0]
            });
            getProvider().getPublicKey().then(publicKey => {
                events.emit("newWallet", new UnisatBitcoinWallet({ address: accounts[0], publicKey }, btcWalletState.data.multichainConnected));
            });
        }
        else {
            events.emit("newWallet", null);
        }
    });
}
function toSchnorrPubkey(ecdsaPublickey) {
    return ecdsaPublickey.slice(2, 66);
}
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
export class UnisatBitcoinWallet extends BitcoinWalletNonSeparated {
    constructor(account, wasAutomaticallyConnected) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.addressType = identifyAddressType(account.address, this.network);
    }
    static async isInstalled() {
        for (let i = 0; i < 10; i++) {
            if (getProvider() != null) {
                setAccountChangeListener();
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
    }
    static async init(_data) {
        const provider = getProvider();
        if (_data?.account != null) {
            return new UnisatBitcoinWallet(_data.account, _data?.multichainConnected);
        }
        ignoreAccountChange = true;
        let addresses;
        try {
            addresses = await provider.requestAccounts();
        }
        catch (e) {
            ignoreAccountChange = false;
            throw e;
        }
        ignoreAccountChange = false;
        console.log("UnisatBitcoinWallet: init(): Loaded wallet accounts: ", addresses);
        if (addresses.length === 0)
            throw new Error("No valid account found");
        currentAccount = addresses[0];
        const publicKey = await provider.getPublicKey();
        console.log("UnisatBitcoinWallet: init(): Fetched account's public key: ", publicKey);
        const acc = {
            address: addresses[0],
            publicKey
        };
        BitcoinWallet.saveState(UnisatBitcoinWallet.walletName, {
            account: acc,
            multichainConnected: _data?.multichainConnected
        });
        return new UnisatBitcoinWallet(acc, _data?.multichainConnected);
    }
    _isOrdinalsAddress(address) {
        return true;
    }
    getBalance() {
        return super._getBalance(this.account.address);
    }
    getReceiveAddress() {
        return this.account.address;
    }
    toBitcoinWalletAccounts() {
        return [{
                pubkey: toSchnorrPubkey(this.account.publicKey), address: this.account.address, addressType: this.addressType
            }];
    }
    async sendTransaction(address, amount, feeRate) {
        const { psbt } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if (psbt == null) {
            throw new Error("Not enough balance!");
        }
        const psbtHex = await getProvider().signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: true,
            toSignInputs: Array.from({ length: psbt.inputsLength }, (_, i) => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey
                };
            })
        });
        if (psbtHex == null)
            throw new Error("User declined the transaction request");
        const finalizedPsbt = Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
        const txHex = Buffer.from(finalizedPsbt.extract()).toString("hex");
        const txId = await super._sendTransaction(txHex);
        console.log("signTransaction returned!");
        return txId;
    }
    getName() {
        return UnisatBitcoinWallet.walletName;
    }
    getIcon() {
        return UnisatBitcoinWallet.iconUrl;
    }
    offWalletChanged(cbk) {
        events.off("newWallet", cbk);
    }
    onWalletChanged(cbk) {
        events.on("newWallet", cbk);
    }
    async signPsbt(psbt, signInputs) {
        const psbtHex = await getProvider().signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: false,
            toSignInputs: signInputs.map(i => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey
                };
            })
        });
        if (psbtHex == null)
            throw new Error("Transaction not properly signed by the wallet!");
        return Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
    }
}
UnisatBitcoinWallet.installUrl = "https://unisat.io/download";
UnisatBitcoinWallet.iconUrl = "wallets/btc/unisat.png";
UnisatBitcoinWallet.walletName = "UniSat";
