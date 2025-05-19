import { ExtensionBitcoinWallet } from "../base/ExtensionBitcoinWallet";
import { PhantomBitcoinWallet } from "../PhantomBitcoinWallet";
import { XverseBitcoinWallet } from "../XverseBitcoinWallet";
import { UnisatBitcoinWallet } from "../UnisatBitcoinWallet";
import { MagicEdenBitcoinWallet } from "../MagicEdenBitcoinWallet";
import { KeplrBitcoinWallet } from "../KeplrBitcoinWallet";
const bitcoinWalletList = [
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
        iconUrl: KeplrBitcoinWallet.iconUrl,
        name: KeplrBitcoinWallet.walletName,
        installUrl: KeplrBitcoinWallet.installUrl,
        detect: KeplrBitcoinWallet.isInstalled,
        use: KeplrBitcoinWallet.init
    },
    {
        iconUrl: MagicEdenBitcoinWallet.iconUrl,
        name: MagicEdenBitcoinWallet.walletName,
        installUrl: MagicEdenBitcoinWallet.installUrl,
        detect: MagicEdenBitcoinWallet.isInstalled,
        use: MagicEdenBitcoinWallet.init
    }
];
let installedBitcoinWallets;
let installableBitcoinWallets;
export async function getInstalledBitcoinWallets() {
    if (installedBitcoinWallets == null) {
        const _installedBitcoinWallets = [];
        const _installableBitcoinWallets = [];
        await Promise.all(bitcoinWalletList.map(wallet => wallet.detect().then(detected => {
            if (detected) {
                _installedBitcoinWallets.push(wallet);
            }
            else {
                if (wallet.installUrl != null)
                    _installableBitcoinWallets.push(wallet);
            }
        })));
        installedBitcoinWallets = _installedBitcoinWallets;
        installableBitcoinWallets = _installableBitcoinWallets;
    }
    let active = null;
    const activeWallet = ExtensionBitcoinWallet.loadState();
    if (activeWallet != null) {
        const walletType = bitcoinWalletList.find(e => e.name === activeWallet.name);
        if (walletType != null) {
            active = () => walletType.use(activeWallet.data);
        }
    }
    return {
        installed: installedBitcoinWallets,
        installable: installableBitcoinWallets,
        active
    };
}
