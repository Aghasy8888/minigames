// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { APP_PAGE, type AppPage } from './app-page';
import { MAIN_NAV_ITEMS, resolveNavTarget, syncActiveNavLinks } from './nav-items';

const { home, library, notFound } = APP_PAGE;
const ACTIVE = 'nav__link--active';

function createLinks(): HTMLAnchorElement[] {
  return [home, library, undefined].map((page) => {
    const link = document.createElement('a');
    if (page) {
      link.dataset.navPage = page;
    }
    document.body.append(link);
    return link;
  });
}

function activeState(links: HTMLAnchorElement[]): { active: boolean; current?: string }[] {
  return links.map((link) => ({
    active: link.classList.contains(ACTIVE),
    current: link.getAttribute('aria-current') ?? undefined,
  }));
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('resolveNavTarget', () => {
  it('opens the item page', () => {
    expect(resolveNavTarget({ page: library })).toBe(library);
  });

  it('sends a placeholder without a page to Home', () => {
    expect(resolveNavTarget({})).toBe(home);
  });

  it('sends every main nav placeholder to Home', () => {
    const targets = MAIN_NAV_ITEMS.map((item) => [item.label, resolveNavTarget(item)]);

    expect(targets).toEqual([
      ['Home', home],
      ['Library', library],
      ['Tournaments', home],
      ['Community', home],
    ]);
  });
});

describe('syncActiveNavLinks', () => {
  it.each<{ page: AppPage; expected: boolean[] }>([
    { page: home, expected: [true, false, false] },
    { page: library, expected: [false, true, false] },
    { page: notFound, expected: [false, false, false] },
  ])('marks only the $page link as current', ({ page, expected }) => {
    const links = createLinks();

    syncActiveNavLinks(links, page, ACTIVE);

    expect(activeState(links)).toEqual(
      expected.map((active) => ({ active, current: active ? 'page' : undefined })),
    );
  });

  it('clears the previous active link when the page changes', () => {
    const links = createLinks();
    syncActiveNavLinks(links, home, ACTIVE);

    syncActiveNavLinks(links, library, ACTIVE);

    expect(activeState(links)).toEqual([
      { active: false, current: undefined },
      { active: true, current: 'page' },
      { active: false, current: undefined },
    ]);
  });
});
