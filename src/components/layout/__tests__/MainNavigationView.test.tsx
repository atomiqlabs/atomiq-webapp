import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainNavigationView } from '../MainNavigationView';

const items = [
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
];

describe('MainNavigationView', () => {
  it('renders nav items, wallet slot, and menu hooks', () => {
    const html = renderToStaticMarkup(
      <MainNavigationView
        navItems={items}
        walletSlot={<a href="/" className="launch-app">Launch App</a>}
        currentPath="/explorer"
        networkBadge={{ show: false, label: '' }}
      />,
    );
    expect(html).toContain('data-nav-toggle');
    expect(html).toContain('data-nav-collapse');
    expect(html).toContain('Launch App');
    expect(html).toContain('href="/explorer"');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
  });

  it('marks the current path active', () => {
    const html = renderToStaticMarkup(
      <MainNavigationView navItems={items} walletSlot={null} currentPath="/explorer" networkBadge={{ show: false, label: '' }} />,
    );
    expect(html).toMatch(/is-active[^>]*>(?:(?!<\/a>).)*Explorer/s);
  });

  it('renders the mobile action-count alert when actionRequiredCount > 0', () => {
    const html = renderToStaticMarkup(
      <MainNavigationView
        navItems={items}
        walletSlot={null}
        currentPath="/"
        networkBadge={{ show: false, label: '' }}
        actionRequiredCount={3}
      />,
    );
    expect(html).toContain('main-navigation__alert');
    expect(html).toContain('>3</div>');
  });
});
