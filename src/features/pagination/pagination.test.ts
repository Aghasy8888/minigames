// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { disabledPaginationArrowIcon, enabledPaginationArrowIcon } from '../../assets/icons';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import type { LibraryGamesState } from '../../hooks/use-library-games';
import type { GameListItem, GamesListMeta } from '../../services/games-api-provider';
import { makeGame, makeGamesMeta } from '../../test-support/api-factories';
import {
  fakeLoadController,
  type FakeLoadController,
} from '../../test-support/fake-load-controller';
import { stubMediaQuery } from '../../test-support/media-query';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

type PaginationModule = typeof import('.');
type Games = FakeLoadController<GameListItem, GamesListMeta>;

const TABLET_SM_QUERY = '(min-width: 735px)';

let pagination: PaginationModule;
let root: HTMLElement;
let games: Games;
let onPageChange: Mock<(page: number) => void>;
let viewport: ReturnType<typeof stubMediaQuery>;

function loaded(meta: Partial<GamesListMeta>): LibraryGamesState {
  return { status: success, data: [makeGame()], meta: makeGamesMeta(meta) };
}

async function load(url: string, { isTablet = true } = {}): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  viewport = stubMediaQuery(isTablet);
  vi.resetModules();
  pagination = await import('.');
}

function mount(initial: LibraryGamesState): void {
  games = fakeLoadController(initial);
  root = pagination.createPagination({ controller: games, onPageChange });
  document.body.append(root);
}

function pageButtons(): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('.pagination__button--page')];
}

function pages(): string[] {
  return pageButtons().map(({ textContent }) => textContent ?? '');
}

function activePage(): string | null | undefined {
  return root.querySelector('[aria-current="page"]')?.textContent;
}

function arrow(direction: 'prev' | 'next'): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(`.pagination__button--${direction}`);
  if (!button) {
    throw new Error(`missing ${direction} button`);
  }
  return button;
}

function arrowStates(): { prev: boolean; next: boolean } {
  return { prev: arrow('prev').disabled, next: arrow('next').disabled };
}

function pageButton(page: number): HTMLButtonElement {
  const button = pageButtons().find(({ textContent }) => textContent === String(page));
  if (!button) {
    throw new Error(`missing page ${page}`);
  }
  return button;
}

beforeEach(async () => {
  onPageChange = vi.fn<(page: number) => void>();
  await load('/library');
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('layout', () => {
  it('is a labelled navigation with previous and next arrows around the page list', () => {
    mount(loaded({}));
    const nav = root.querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Pagination');
    expect([...(nav?.children ?? [])].map(({ className }) => className)).toStrictEqual([
      'pagination__button pagination__button--arrow pagination__button--prev',
      'pagination__pages',
      'pagination__button pagination__button--arrow pagination__button--next',
    ]);
    expect(arrow('prev').getAttribute('aria-label')).toBe('Previous page');
    expect(arrow('next').getAttribute('aria-label')).toBe('Next page');
    expect(arrow('prev').type).toBe('button');
  });

  it('marks the arrow icons as decorative', () => {
    mount(loaded({}));
    const icon = arrow('next').querySelector('img');

    expect(icon?.getAttribute('alt')).toBe('');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names every page button and marks only the current page', () => {
    mount(loaded({ page: 2 }));

    expect(pageButtons().map((button) => button.getAttribute('aria-label'))).toStrictEqual([
      'Page 1',
      'Page 2',
      'Page 3',
      'Page 4',
    ]);
    expect(activePage()).toBe('2');
    expect(pageButton(2).classList.contains('pagination__button--active')).toBe(true);
    expect(pageButton(1).classList.contains('pagination__button--active')).toBe(false);
    expect(pageButton(1).hasAttribute('aria-current')).toBe(false);
  });

  it('watches the small-tablet breakpoint used by the stylesheet', () => {
    mount(loaded({}));

    expect(viewport.requestedQueries).toStrictEqual([TABLET_SM_QUERY]);
  });
});

describe('pages from the API', () => {
  it.each([
    { name: 'the first page disables Previous', page: 1, arrows: { prev: true, next: false } },
    { name: 'a middle page enables both arrows', page: 2, arrows: { prev: false, next: false } },
    { name: 'the last page disables Next', page: 4, arrows: { prev: false, next: true } },
  ])('$name', ({ page, arrows }) => {
    mount(loaded({ page, totalPages: 4 }));

    expect(arrowStates()).toStrictEqual(arrows);
    expect(activePage()).toBe(String(page));
  });

  it('swaps the arrow icon for a disabled arrow', () => {
    mount(loaded({ page: 1, totalPages: 4 }));

    expect(arrow('prev').querySelector('img')?.getAttribute('src')).toBe(
      disabledPaginationArrowIcon,
    );
    expect(arrow('next').querySelector('img')?.getAttribute('src')).toBe(
      enabledPaginationArrowIcon,
    );
  });

  it('takes the current page from the response, not from the URL', async () => {
    await load('/library?page=3');

    mount(loaded({ page: 2, totalPages: 4 }));

    expect(activePage()).toBe('2');
  });

  it.each([
    {
      name: 'an empty result',
      state: { status: empty, meta: makeGamesMeta({ totalPages: 0, totalItems: 0 }) },
    },
    { name: 'an empty result without meta', state: { status: empty } },
    { name: 'a result without meta', state: { status: success, data: [makeGame()] } },
  ] satisfies { name: string; state: LibraryGamesState }[])(
    'shows a single disabled page for $name',
    async ({ state }) => {
      await load('/library?page=3');

      mount(state);

      expect(pages()).toStrictEqual(['1']);
      expect(activePage()).toBe('1');
      expect(arrowStates()).toStrictEqual({ prev: true, next: true });
    },
  );
});

describe('while loading or after an error', () => {
  it.each([
    { name: 'loading', state: { status: loading } },
    {
      name: 'an error',
      state: { status: errorStatus, message: 'Games are unavailable.', retry: vi.fn() },
    },
  ] satisfies { name: string; state: LibraryGamesState }[])(
    'keeps the last known page count and follows the requested page during $name',
    async ({ state }) => {
      await load('/library?page=3');
      mount(loaded({ page: 2, totalPages: 4 }));

      games.emit(state);

      expect(pages()).toStrictEqual(['1', '2', '3', '4']);
      expect(activePage()).toBe('3');
    },
  );

  it('shows the requested page before the first response arrives', async () => {
    await load('/library?page=2');

    mount({ status: loading });

    expect(pages()).toStrictEqual(['1', '2']);
    expect(activePage()).toBe('2');
    expect(arrowStates()).toStrictEqual({ prev: false, next: true });
  });

  it('forgets the page count after an empty result', () => {
    mount(loaded({ page: 1, totalPages: 4 }));
    games.emit({ status: empty, meta: makeGamesMeta({ totalPages: 0, totalItems: 0 }) });

    games.emit({ status: loading });

    expect(pages()).toStrictEqual(['1']);
  });
});

describe('visible window', () => {
  it.each([
    {
      name: 'four pages on tablet and up',
      isTablet: true,
      page: 1,
      totalPages: 8,
      shown: ['1', '2', '3', '4'],
    },
    {
      name: 'three pages on mobile',
      isTablet: false,
      page: 1,
      totalPages: 8,
      shown: ['1', '2', '3'],
    },
    {
      name: 'the current page centered on mobile',
      isTablet: false,
      page: 5,
      totalPages: 8,
      shown: ['4', '5', '6'],
    },
    {
      name: 'the last pages at the end on mobile',
      isTablet: false,
      page: 8,
      totalPages: 8,
      shown: ['6', '7', '8'],
    },
  ])('shows $name', async ({ isTablet, page, totalPages, shown }) => {
    await load('/library', { isTablet });

    mount(loaded({ page, totalPages }));

    expect(pages()).toStrictEqual(shown);
  });

  it('re-renders the window when the viewport crosses the breakpoint', async () => {
    await load('/library', { isTablet: false });
    mount(loaded({ page: 1, totalPages: 8 }));

    viewport.change(true);

    expect(pages()).toStrictEqual(['1', '2', '3', '4']);
  });
});

describe('changing pages', () => {
  beforeEach(() => {
    mount(loaded({ page: 2, totalPages: 4 }));
  });

  it('asks for the clicked page', () => {
    pageButton(4).click();

    expect(onPageChange.mock.calls).toStrictEqual([[4]]);
  });

  it('ignores a click on the current page', () => {
    pageButton(2).click();

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'Previous asks for the page before', direction: 'prev' as const, page: 1 },
    { name: 'Next asks for the page after', direction: 'next' as const, page: 3 },
  ])('$name', ({ direction, page }) => {
    arrow(direction).click();

    expect(onPageChange.mock.calls).toStrictEqual([[page]]);
  });

  it('never asks for a page past the last one', () => {
    games.emit(loaded({ page: 4, totalPages: 4 }));

    arrow('next').dispatchEvent(new MouseEvent('click'));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('never asks for a page before the first one', () => {
    games.emit(loaded({ page: 1, totalPages: 4 }));

    arrow('prev').dispatchEvent(new MouseEvent('click'));

    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe('unmounting', () => {
  it('stops following the games and the viewport', async () => {
    mount(loaded({ page: 1, totalPages: 8 }));
    root.remove();
    await Promise.resolve();
    await Promise.resolve();

    games.emit(loaded({ page: 5, totalPages: 8 }));
    viewport.change(false);

    expect(pages()).toStrictEqual(['1', '2', '3', '4']);
  });
});
