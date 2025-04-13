import {PhantomBitcoinWallet} from "./wallets/PhantomBitcoinWallet";
import {BitcoinWallet} from "./BitcoinWallet";
import {XverseBitcoinWallet} from "./wallets/XverseBitcoinWallet";
import {MagicEdenBitcoinWallet} from "./wallets/MagicEdenBitcoinWallet";
import {UnisatBitcoinWallet} from "./wallets/UnisatBitcoinWallet";

export type BitcoinWalletType = {
    iconUrl: string,
    name: string,
    installUrl: string,
    detect: () => Promise<boolean>,
    use: (data?: any) => Promise<BitcoinWallet>
};

const bitcoinWalletList: BitcoinWalletType[] = [
    {
        iconUrl: PhantomBitcoinWallet.iconUrl,
        name: PhantomBitcoinWallet.walletName,
        installUrl: PhantomBitcoinWallet.installUrl,
        detect: PhantomBitcoinWallet.isInstalled,
        use: PhantomBitcoinWallet.init
    },
    {
        iconUrl: XverseBitcoinWallet.iconUrl,
        name: XverseBitcoinWallet.walletName,
        installUrl: XverseBitcoinWallet.installUrl,
        detect: XverseBitcoinWallet.isInstalled,
        use: XverseBitcoinWallet.init
    },
    {
        iconUrl: UnisatBitcoinWallet.iconUrl,
        name: UnisatBitcoinWallet.walletName,
        installUrl: UnisatBitcoinWallet.installUrl,
        detect: UnisatBitcoinWallet.isInstalled,
        use: UnisatBitcoinWallet.init
    },
    {
        iconUrl: MagicEdenBitcoinWallet.iconUrl,
        name: MagicEdenBitcoinWallet.walletName,
        installUrl: MagicEdenBitcoinWallet.installUrl,
        detect: MagicEdenBitcoinWallet.isInstalled,
        use: MagicEdenBitcoinWallet.init
    }
];

let installedBitcoinWallets: BitcoinWalletType[];
let installableBitcoinWallets: BitcoinWalletType[];

export async function getInstalledBitcoinWallets(): Promise<{
    installed: BitcoinWalletType[],
    installable: BitcoinWalletType[],
    active: () => Promise<BitcoinWallet>
}> {
    if(installedBitcoinWallets==null) {
        const _installedBitcoinWallets: BitcoinWalletType[] = [];
        const _installableBitcoinWallets: BitcoinWalletType[] = [];
        await Promise.all(bitcoinWalletList.map(wallet => wallet.detect().then(detected => {
            if (detected) {
                _installedBitcoinWallets.push(wallet);
            } else {
                if(wallet.installUrl!=null) _installableBitcoinWallets.push(wallet);
            }
        })));
        installedBitcoinWallets = _installedBitcoinWallets;
        installableBitcoinWallets = _installableBitcoinWallets;
    }

    let active: () => Promise<BitcoinWallet> = null;

    const activeWallet = BitcoinWallet.loadState();
    if(activeWallet!=null) {
        const walletType = bitcoinWalletList.find(e => e.name===activeWallet.name);
        if(walletType!=null) {
            active = () => walletType.use(activeWallet.data);
        }
    }

    return {
        installed: installedBitcoinWallets,
        installable: installableBitcoinWallets,
        active
    }
}

export async function getBitcoinWalletAsPartOfMultichainWallet(smartchainWalletName: string): Promise<BitcoinWallet> {
    const activeWallet = BitcoinWallet.loadState();
    if(activeWallet!=null) {
        console.log("Active wallet not null");
        return null;
    }

    const walletType = bitcoinWalletList.find(e => e.name===smartchainWalletName);
    if(walletType==null) return null;
    if(!await walletType.detect()) return null;

    return await walletType.use();
}
