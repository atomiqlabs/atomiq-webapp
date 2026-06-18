import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { BitcoinNetwork, SwapType } from '@atomiqlabs/sdk';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { WalletConnector } from '../wallets/WalletConnector';
import { SwapperContext } from '../../context/SwapperContext';
import { useAnchorNavigate } from '../../hooks/navigation/useAnchorNavigate';
import { ChainsConfig } from '../../data/ChainsConfig';
import { SettingsModal } from '../modals/SettingsModal';
import { MainNavigationView, NavItem } from './MainNavigationView';

export function MainNavigation(props: {}) {
  const location = useLocation();
  const [actionRequiredCount, setActionRequiredCount] = React.useState<number>(0);
  const { swapper, syncing, syncingError } = React.useContext(SwapperContext);
  const [settingsOpened, setSettingsOpened] = useState<boolean>(false);
  const anchorNavigate = useAnchorNavigate();

  React.useEffect(() => {
    if (swapper == null) return;
    const updateActionCount = async () => {
      const swaps = await swapper.getActionableSwaps();
      const initiated = swaps.filter((swap) => swap.isInitiated());
      const notTrusted = initiated.filter(
        (swap) =>
          swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
          swap.getType() !== SwapType.TRUSTED_FROM_BTCLN,
      );
      setActionRequiredCount(notTrusted.filter((swap) => swap.requiresAction()).length);
    };
    updateActionCount();
    const listener = () => updateActionCount();
    swapper.on('swapState', listener);
    return () => {
      swapper.off('swapState', listener);
    };
  }, [swapper]);

  const navItems: NavItem[] = [
    { link: '/', icon: 'swap-nav', title: 'Swap' },
    {
      link: '/history',
      icon: 'Swap-History',
      title: (
        <>
          <span>Swap History</span>
          {syncing && <Spinner className="text-white ms-2" size="sm" />}
          {syncingError && <Icon size={20} className="ms-2 flex" icon={ic_warning} />}
        </>
      ),
      count: actionRequiredCount > 0 ? actionRequiredCount : undefined,
    },
    { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
    { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
    { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  ];

  const settingsSlot = (
    <a
      href="/settings"
      onClick={(e) => {
        e.preventDefault();
        setSettingsOpened(true);
      }}
      className="dropdown-item"
    >
      <span className="me-2 main-navigation__item__icon icon icon-cog" />
      Settings
    </a>
  );

  return (
    <>
      <SettingsModal opened={settingsOpened} close={() => setSettingsOpened(false)} />
      <MainNavigationView
        navItems={navItems}
        walletSlot={<WalletConnector />}
        settingsSlot={settingsSlot}
        currentPath={location.pathname}
        networkBadge={{
          show: ChainsConfig.BITCOIN.network !== BitcoinNetwork.MAINNET,
          label: BitcoinNetwork[ChainsConfig.BITCOIN.network],
        }}
        onNavClick={anchorNavigate}
      />
    </>
  );
}
