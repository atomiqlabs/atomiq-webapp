import { ExtensionBitcoinWallet } from "../base/ExtensionBitcoinWallet";
import { PhantomBitcoinWallet } from "../PhantomBitcoinWallet";
import { XverseBitcoinWallet } from "../XverseBitcoinWallet";
import { UnisatBitcoinWallet } from "../UnisatBitcoinWallet";
import { MagicEdenBitcoinWallet } from "../MagicEdenBitcoinWallet";
import { KeplrBitcoinWallet } from "../KeplrBitcoinWallet";

export type BitcoinWalletType = {
  iconUrl: string;
  name: string;
  installUrl: string;
  detect: () => Promise<boolean>;
  use: (data?: any) => Promise<ExtensionBitcoinWallet>;
};

const bitcoinWalletList: BitcoinWalletType[] = [
  {
    iconUrl: PhantomBitcoinWallet.iconUrl,
    name: PhantomBitcoinWallet.walletName,
    installUrl: PhantomBitcoinWallet.installUrl,
    detect: PhantomBitcoinWallet.isInstalled,
    use: PhantomBitcoinWallet.init,
  },
  {
    iconUrl: XverseBitcoinWallet.iconUrl,
    name: XverseBitcoinWallet.walletName,
    installUrl: XverseBitcoinWallet.installUrl,
    detect: XverseBitcoinWallet.isInstalled,
    use: XverseBitcoinWallet.init,
  },
  {
    iconUrl: UnisatBitcoinWallet.iconUrl,
    name: UnisatBitcoinWallet.walletName,
    installUrl: UnisatBitcoinWallet.installUrl,
    detect: UnisatBitcoinWallet.isInstalled,
    use: UnisatBitcoinWallet.init,
  },
  {
    iconUrl: KeplrBitcoinWallet.iconUrl,
    name: KeplrBitcoinWallet.walletName,
    installUrl: KeplrBitcoinWallet.installUrl,
    detect: KeplrBitcoinWallet.isInstalled,
    use: KeplrBitcoinWallet.init,
  },
  {
    iconUrl: MagicEdenBitcoinWallet.iconUrl,
    name: MagicEdenBitcoinWallet.walletName,
    installUrl: MagicEdenBitcoinWallet.installUrl,
    detect: MagicEdenBitcoinWallet.isInstalled,
    use: MagicEdenBitcoinWallet.init,
  },
];

let installedBitcoinWallets: BitcoinWalletType[];
let installableBitcoinWallets: BitcoinWalletType[];

export async function getInstalledBitcoinWallets(): Promise<{
  installed: BitcoinWalletType[];
  installable: BitcoinWalletType[];
  active: () => Promise<ExtensionBitcoinWallet>;
}> {
  if (installedBitcoinWallets == null) {
    const _installedBitcoinWallets: BitcoinWalletType[] = [];
    const _installableBitcoinWallets: BitcoinWalletType[] = [];
    await Promise.all(
      bitcoinWalletList.map((wallet) =>
        wallet.detect().then((detected) => {
          if (detected) {
            _installedBitcoinWallets.push(wallet);
          } else {
            if (wallet.installUrl != null)
              _installableBitcoinWallets.push(wallet);
          }
        }),
      ),
    );
    installedBitcoinWallets = _installedBitcoinWallets;
    installableBitcoinWallets = _installableBitcoinWallets;
  }

  let active: () => Promise<ExtensionBitcoinWallet> = null;

  const activeWallet = ExtensionBitcoinWallet.loadState();
  if (activeWallet != null) {
    const walletType = bitcoinWalletList.find(
      (e) => e.name === activeWallet.name,
    );
    if (walletType != null) {
      active = () => walletType.use(activeWallet.data);
    }
  }

  return {
    installed: installedBitcoinWallets,
    installable: installableBitcoinWallets,
    active,
  };
}
