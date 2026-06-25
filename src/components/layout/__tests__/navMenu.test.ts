import { describe, it, expect, beforeEach } from 'vitest';

async function loadNavMenu() {
  // public/navMenu.js attaches delegated listeners and calls init on load
  await import('../../../../public/navMenu.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

beforeEach(() => {
  document.body.innerHTML = `
    <button data-nav-toggle>menu</button>
    <div data-nav-collapse>
      <a href="/swap/x" id="lnk">link</a>
      <div data-nav-dropdown>
        <button data-nav-dropdown-toggle>More</button>
        <div class="dropdown-menu"></div>
      </div>
    </div>
    <div id="outside">outside</div>`;
});

describe('navMenu', () => {
  it('toggles the collapse open and closed via the hamburger', async () => {
    await loadNavMenu();
    const collapse = document.querySelector('[data-nav-collapse]')!;
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(true);
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(false);
  });

  it('closes the collapse when a nav link is clicked', async () => {
    await loadNavMenu();
    const collapse = document.querySelector('[data-nav-collapse]')!;
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    (document.getElementById('lnk') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(false);
  });

  it('toggles the More dropdown', async () => {
    await loadNavMenu();
    const dd = document.querySelector('[data-nav-dropdown]')!;
    (document.querySelector('[data-nav-dropdown-toggle]') as HTMLElement).click();
    expect(dd.classList.contains('show')).toBe(true);
  });

  it('injects an overlay when opening and removes it on close', async () => {
    await loadNavMenu();
    const toggle = document.querySelector('[data-nav-toggle]') as HTMLElement;
    toggle.click();
    expect(document.querySelector('.main-navigation__overlay')).not.toBeNull();
    toggle.click();
    expect(document.querySelector('.main-navigation__overlay')).toBeNull();
  });
});
