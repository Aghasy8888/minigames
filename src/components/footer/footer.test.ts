// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { codeIcon, rsIcon, shareIcon } from '../../assets/icons';
import { currentUrl } from '../../test-support/history';
import { createFooter } from '.';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

let footer: HTMLElement;

function mount(): void {
  footer = createFooter();
  document.body.append(footer);
}

function query<T extends Element>(selector: string): T {
  const element = footer.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function linksIn(column: Element): { label: string | null; href: string | null }[] {
  return [...column.querySelectorAll('a')].map((link) => ({
    label: link.textContent,
    href: link.getAttribute('href'),
  }));
}

function columns(): Element[] {
  return [...footer.querySelectorAll('.footer__column')];
}

function columnAt(index: number): Element {
  const column = columns()[index];
  if (!column) {
    throw new Error(`missing column ${index}`);
  }
  return column;
}

beforeEach(() => {
  globalThis.history.replaceState(undefined, '', '/');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('brand', () => {
  beforeEach(mount);

  it('is a footer landmark whose logo links Home', () => {
    const logo = query<HTMLAnchorElement>('.footer__logo');

    expect(footer.tagName).toBe('FOOTER');
    expect(logo.getAttribute('href')).toBe('/');
    expect(logo.textContent).toBe('MiniGames');
    expect(logo.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('shows the tagline', () => {
    expect(query('.footer__tagline').textContent).toBe(
      'Take a short break and have fun. Hundreds of curated casual mini-games right in your web browser. No download required.',
    );
  });
});

describe('navigation columns', () => {
  beforeEach(mount);

  it('titles the Explore, Company, and Community columns', () => {
    expect(columns().map((column) => column.querySelector('h3')?.textContent)).toStrictEqual([
      'Explore',
      'Company',
      'Community',
    ]);
  });

  it('links real pages to their routes and sends placeholders Home', () => {
    expect(linksIn(columnAt(0))).toStrictEqual([
      { label: 'Home', href: '/' },
      { label: 'Library', href: '/library' },
      { label: 'Categories', href: '/' },
      { label: 'Tournaments', href: '/' },
    ]);
    expect(linksIn(columnAt(1))).toStrictEqual([
      { label: 'About Us', href: '/' },
      { label: 'Contact', href: '/' },
      { label: 'Privacy Policy', href: '/' },
      { label: 'Terms of Service', href: '/' },
    ]);
  });

  it('marks only real pages for the active-link highlight', () => {
    const marked = [...footer.querySelectorAll<HTMLAnchorElement>('.footer__link')]
      .filter(({ dataset }) => dataset.navPage !== undefined)
      .map(({ textContent, dataset }) => [textContent, dataset.navPage]);

    expect(marked).toStrictEqual([
      ['Home', 'home'],
      ['Library', 'library'],
    ]);
  });

  it('opens the Library in place on a plain click, without a reload', () => {
    const library = [...footer.querySelectorAll<HTMLAnchorElement>('.footer__link')].find(
      ({ textContent }) => textContent === 'Library',
    );
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    library?.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(currentUrl()).toBe('/library');
  });
});

describe('community links', () => {
  beforeEach(mount);

  it('names each icon-only social link for screen readers', () => {
    const socials = [...footer.querySelectorAll<HTMLAnchorElement>('.footer__social')];

    expect(socials.map((link) => link.getAttribute('aria-label'))).toStrictEqual([
      'Share',
      'Chat',
      'RSS feed',
    ]);
    expect(socials.map((link) => link.getAttribute('href'))).toStrictEqual(['/', '/', '/']);
  });

  it('uses decorative icons for the social links', () => {
    const [share] = footer.querySelectorAll<HTMLImageElement>('.footer__social-icon');

    expect(share?.getAttribute('src')).toBe(shareIcon);
    expect(share?.getAttribute('alt')).toBe('');
  });
});

describe('bottom bar', () => {
  beforeEach(mount);

  it('shows the copyright and the closing line', () => {
    expect(query('.footer__copyright').textContent).toBe('© 2026 MiniGames. All rights reserved.');
    expect(query('.footer__designed').textContent).toBe('Designed with love');
  });

  it.each([
    {
      name: 'RS School',
      modifier: 'rs',
      href: 'https://rs.school/courses/short-track',
      icon: rsIcon,
    },
    {
      name: '@Aghasy8888',
      modifier: 'github',
      href: 'https://github.com/Aghasy8888',
      icon: codeIcon,
    },
  ])(
    'opens the $name credit in a new tab without leaking the opener',
    ({ name, modifier, href, icon }) => {
      const credit = query<HTMLAnchorElement>(`.footer__credit--${modifier}`);

      expect(credit.textContent).toBe(name);
      expect(credit.getAttribute('href')).toBe(href);
      expect(credit.target).toBe('_blank');
      expect(credit.rel).toBe('noopener noreferrer');
      expect(credit.querySelector('.footer__credit-icon')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
      expect(credit.querySelector('img')?.getAttribute('src')).toBe(icon);
    },
  );
});

describe('production base', () => {
  it('prefixes every internal link with the deploy base', () => {
    vi.stubEnv('BASE_URL', '/minigames/');

    mount();

    expect(query('.footer__logo').getAttribute('href')).toBe('/minigames/');
    expect(linksIn(columnAt(0)).map(({ href }) => href)).toStrictEqual([
      '/minigames/',
      '/minigames/library',
      '/minigames/',
      '/minigames/',
    ]);
  });
});
