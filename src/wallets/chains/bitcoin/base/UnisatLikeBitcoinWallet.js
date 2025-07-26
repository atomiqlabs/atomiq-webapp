import { Transaction, Address as AddressParser } from "@scure/btc-signer";
import * as EventEmitter from "events";
import { BitcoinWalletNonSeparated } from "./BitcoinWalletNonSeparated";
import { ExtensionBitcoinWallet } from "./ExtensionBitcoinWallet";
export class UnisatLikeWalletChangeListener {
    constructor(ctor, provider, name) {
        this.events = new EventEmitter();
        this.ignoreAccountChange = false;
        this.provider = provider;
        provider.on("accountsChanged", (accounts) => {
            console.log(name +
                "BitcoinWallet: accountsChanged, ignore: " +
                this.ignoreAccountChange +
                " accounts: ", accounts);
            if (this.ignoreAccountChange)
                return;
            let btcWalletState = ExtensionBitcoinWallet.loadState();
            if (btcWalletState == null || btcWalletState.name !== name)
                return;
            if (accounts != null && accounts.length > 0) {
                if (this.currentAccount != null && accounts[0] == this.currentAccount)
                    return;
                this.currentAccount = accounts[0];
                provider.getPublicKey().then((publicKey) => {
                    const account = { address: accounts[0], publicKey };
                    ExtensionBitcoinWallet.saveState(name, {
                        account,
                        multichainConnected: btcWalletState.data.multichainConnected,
                    });
                    this.events.emit("newWallet", new ctor({ address: accounts[0], publicKey }, btcWalletState.data.multichainConnected));
                });
            }
            else {
                this.events.emit("newWallet", null);
            }
        });
    }
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
export class UnisatLikeBitcoinWallet extends BitcoinWalletNonSeparated {
    get listener() {
        return UnisatLikeBitcoinWallet.changeListeners[this.getName()];
    }
    get provider() {
        return UnisatLikeBitcoinWallet.changeListeners[this.getName()]?.provider;
    }
    constructor(account, wasAutomaticallyConnected) {
        super(wasAutomaticallyConnected);
        this.account = account;
        this.addressType = identifyAddressType(account.address, this.network);
    }
    static async _isInstalled(getProvider, ctor, name) {
        var _a;
        for (let i = 0; i < 10; i++) {
            if (getProvider() != null) {
                (_a = UnisatLikeBitcoinWallet.changeListeners)[name] ?? (_a[name] = new UnisatLikeWalletChangeListener(ctor, getProvider(), name));
                return true;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return false;
    }
    static async _init(getProvider, ctor, name, _data) {
        const provider = getProvider();
        if (_data?.account != null) {
            return new ctor(_data.account, _data?.multichainConnected);
        }
        UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = true;
        let addresses;
        try {
            addresses = await provider.requestAccounts();
        }
        catch (e) {
            UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = false;
            throw e;
        }
        UnisatLikeBitcoinWallet.changeListeners[name].ignoreAccountChange = false;
        console.log(name + "BitcoinWallet: init(): Loaded wallet accounts: ", addresses);
        if (addresses.length === 0)
            throw new Error("No valid account found");
        UnisatLikeBitcoinWallet.changeListeners[name].currentAccount = addresses[0];
        const publicKey = await provider.getPublicKey();
        console.log(name + "BitcoinWallet: init(): Fetched account's public key: ", publicKey);
        const acc = {
            address: addresses[0],
            publicKey,
        };
        ExtensionBitcoinWallet.saveState(name, {
            account: acc,
            multichainConnected: _data?.multichainConnected,
        });
        return new ctor(acc, _data?.multichainConnected);
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
        return [
            {
                pubkey: toSchnorrPubkey(this.account.publicKey),
                address: this.account.address,
                addressType: this.addressType,
            },
        ];
    }
    async sendTransaction(address, amount, feeRate) {
        const { psbt } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if (psbt == null) {
            throw new Error("Not enough balance!");
        }
        const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: true,
            toSignInputs: Array.from({ length: psbt.inputsLength }, (_, i) => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey,
                };
            }),
        });
        if (psbtHex == null)
            throw new Error("User declined the transaction request");
        const finalizedPsbt = Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
        const txHex = Buffer.from(finalizedPsbt.extract()).toString("hex");
        const txId = await super._sendTransaction(txHex);
        return txId;
    }
    offWalletChanged(cbk) {
        this.listener.events.off("newWallet", cbk);
    }
    onWalletChanged(cbk) {
        this.listener.events.on("newWallet", cbk);
    }
    async signPsbt(psbt, signInputs) {
        const psbtHex = await this.provider.signPsbt(Buffer.from(psbt.toPSBT(0)).toString("hex"), {
            autoFinalized: false,
            toSignInputs: signInputs.map((i) => {
                return {
                    index: i,
                    address: this.account.address,
                    publicKey: this.account.publicKey,
                };
            }),
        });
        if (psbtHex == null)
            throw new Error("Transaction not properly signed by the wallet!");
        return Transaction.fromPSBT(Buffer.from(psbtHex, "hex"));
    }
}
UnisatLikeBitcoinWallet.changeListeners = {};
