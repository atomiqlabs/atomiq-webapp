import {PhantomBitcoinWallet} from "./wallets/PhantomBitcoinWallet";
import {BitcoinWallet} from "./BitcoinWallet";
import {XverseBitcoinWallet} from "./wallets/XverseBitcoinWallet";
import {MagicEdenBitcoinWallet} from "./wallets/MagicEdenBitcoinWallet";

export type BitcoinWalletType = {
    iconUrl: string,
    name: string,
    detect: () => Promise<boolean>,
    use: (data?: any) => Promise<BitcoinWallet>
};

const bitcoinWalletList: BitcoinWalletType[] = [
    {
        iconUrl: PhantomBitcoinWallet.iconUrl,
        name: PhantomBitcoinWallet.walletName,
        detect: PhantomBitcoinWallet.isInstalled,
        use: PhantomBitcoinWallet.init
    },
    {
        iconUrl: MagicEdenBitcoinWallet.iconUrl,
        name: MagicEdenBitcoinWallet.walletName,
        detect: MagicEdenBitcoinWallet.isInstalled,
        use: MagicEdenBitcoinWallet.init
    },
    {
        iconUrl: XverseBitcoinWallet.iconUrl,
        name: XverseBitcoinWallet.walletName,
        detect: XverseBitcoinWallet.isInstalled,
        use: XverseBitcoinWallet.init
    }
];

let installedBitcoinWallets: BitcoinWalletType[];

export async function getInstalledBitcoinWallets(): Promise<{
    installed: BitcoinWalletType[],
    active: () => Promise<BitcoinWallet>
}> {
    if(installedBitcoinWallets==null) {
        const resultArr: BitcoinWalletType[] = [];
        for(let wallet of bitcoinWalletList) {
            if (await wallet.detect()) {
                resultArr.push(wallet);
            }
        }
        installedBitcoinWallets = resultArr;
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
