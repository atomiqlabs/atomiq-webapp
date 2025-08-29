import { ExtensionBitcoinWallet } from "../base/ExtensionBitcoinWallet";
import { PhantomBitcoinWallet } from "../PhantomBitcoinWallet";
import { XverseBitcoinWallet } from "../XverseBitcoinWallet";
import { UnisatBitcoinWallet } from "../UnisatBitcoinWallet";
import { MagicEdenBitcoinWallet } from "../MagicEdenBitcoinWallet";
import { KeplrBitcoinWallet } from "../KeplrBitcoinWallet";
import { OKXBitcoinWallet } from "../OKXBitcoinWallet";
import { FEConstants } from "../../../../FEConstants";
const bitcoinWalletList = [
    {
        iconUrl: PhantomBitcoinWallet.iconUrl,
        name: PhantomBitcoinWallet.walletName,
        installUrl: PhantomBitcoinWallet.installUrl,
        detect: PhantomBitcoinWallet.isInstalled,
        use: PhantomBitcoinWallet.init,
        supportsCurrentBtcNetwork: PhantomBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    },
    {
        iconUrl: XverseBitcoinWallet.iconUrl,
        name: XverseBitcoinWallet.walletName,
        installUrl: XverseBitcoinWallet.installUrl,
        detect: XverseBitcoinWallet.isInstalled,
        use: XverseBitcoinWallet.init,
        supportsCurrentBtcNetwork: XverseBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    },
    {
        iconUrl: UnisatBitcoinWallet.iconUrl,
        name: UnisatBitcoinWallet.walletName,
        installUrl: UnisatBitcoinWallet.installUrl,
        detect: UnisatBitcoinWallet.isInstalled,
        use: UnisatBitcoinWallet.init,
        supportsCurrentBtcNetwork: UnisatBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    },
    {
        iconUrl: KeplrBitcoinWallet.iconUrl,
        name: KeplrBitcoinWallet.walletName,
        installUrl: KeplrBitcoinWallet.installUrl,
        detect: KeplrBitcoinWallet.isInstalled,
        use: KeplrBitcoinWallet.init,
        supportsCurrentBtcNetwork: KeplrBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    },
    {
        iconUrl: MagicEdenBitcoinWallet.iconUrl,
        name: MagicEdenBitcoinWallet.walletName,
        installUrl: MagicEdenBitcoinWallet.installUrl,
        detect: MagicEdenBitcoinWallet.isInstalled,
        use: MagicEdenBitcoinWallet.init,
        supportsCurrentBtcNetwork: MagicEdenBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    },
    {
        iconUrl: OKXBitcoinWallet.iconUrl,
        name: OKXBitcoinWallet.walletName,
        installUrl: OKXBitcoinWallet.installUrl,
        detect: OKXBitcoinWallet.isInstalled,
        use: OKXBitcoinWallet.init,
        supportsCurrentBtcNetwork: OKXBitcoinWallet.supportedNetwork.includes(FEConstants.bitcoinNetwork)
    }
].filter(val => val.supportsCurrentBtcNetwork);
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
