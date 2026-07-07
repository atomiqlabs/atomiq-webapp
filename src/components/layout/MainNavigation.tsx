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
  const { initializedSwapper, loading, syncing, syncingError } = React.useContext(SwapperContext);
  const [settingsOpened, setSettingsOpened] = useState<boolean>(false);
  const anchorNavigate = useAnchorNavigate();

  React.useEffect(() => {
    if (initializedSwapper == null) return;
    const updateActionCount = async () => {
      const swaps = await initializedSwapper.getActionableSwaps();
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
    initializedSwapper.on('swapState', listener);
    return () => {
      initializedSwapper.off('swapState', listener);
    };
  }, [initializedSwapper]);

  const navItems: NavItem[] = [
    { link: '/', icon: 'swap-nav', title: 'Swap' },
    {
      link: '/history',
      icon: 'Swap-History',
      title: (
        <>
          <span>Swap History</span>
          {(loading || syncing) && <Spinner className="text-white ms-2" size="sm" />}
          {syncingError && <Icon size={20} className="ms-2 flex" icon={ic_warning} />}
        </>
      ),
      count: actionRequiredCount > 0 ? actionRequiredCount : undefined,
    },
    { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
    { link: 'https://docs.atomiq.exchange/sdk-guide/', icon: 'embed2', title: 'SDK', external: true },
    { link: 'https://docs.atomiq.exchange/rest-api-guide/', icon: 'file-text', title: 'API', external: true },
    {
      link: '/settings',
      icon: 'cog',
      title: 'Settings',
      onClick: (e) => {
        e.preventDefault();
        setSettingsOpened(true);
      },
    }
  ];

  return (
    <>
      <SettingsModal opened={settingsOpened} close={() => setSettingsOpened(false)} />
      <MainNavigationView
        navItems={navItems}
        walletSlot={<WalletConnector />}
        currentPath={location.pathname}
        networkBadge={{
          show: ChainsConfig.BITCOIN.network !== BitcoinNetwork.MAINNET,
          label: BitcoinNetwork[ChainsConfig.BITCOIN.network],
        }}
        actionRequiredCount={actionRequiredCount}
        onNavClick={anchorNavigate}
      />
    </>
  );
}
