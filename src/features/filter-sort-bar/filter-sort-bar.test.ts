// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CategoriesState } from '../../hooks/use-categories';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import type { LibraryGamesState } from '../../hooks/use-library-games';
import type {
  CategoriesMeta,
  CategoryItem,
  GameListItem,
  GamesListMeta,
} from '../../services/games-api-provider';
import { makeCategory, makeGame, makeGamesMeta } from '../../test-support/api-factories';
import {
  fakeLoadController,
  type FakeLoadController,
} from '../../test-support/fake-load-controller';
import { currentUrl } from '../../test-support/history';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

type LibraryQueryStore = typeof import('../../store/library-query-store');
type Categories = FakeLoadController<CategoryItem, CategoriesMeta>;
type Games = FakeLoadController<GameListItem, GamesListMeta>;

const CATEGORY_LIST: CategoryItem[] = [
  makeCategory({ slug: 'all', label: 'All', isDefault: true }),
  makeCategory({ slug: 'puzzle', label: 'Puzzle', isDefault: false }),
  makeCategory({ slug: 'card', label: 'Card', isDefault: false }),
];
const LOADED_CATEGORIES: CategoriesState = { status: success, data: CATEGORY_LIST };
const LOADED_GAMES: LibraryGamesState = {
  status: success,
  data: [makeGame()],
  meta: makeGamesMeta({ totalItems: 24 }),
};

let section: HTMLElement;
let categories: Categories;
let games: Games;
let libraryQuery: LibraryQueryStore;

async function mount(
  url = '/library',
  {
    categoriesState = LOADED_CATEGORIES,
    gamesState = LOADED_GAMES,
  }: { categoriesState?: CategoriesState; gamesState?: LibraryGamesState } = {},
): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  libraryQuery = await import('../../store/library-query-store');
  const { createFilterSortBar } = await import('.');
  categories = fakeLoadController(categoriesState);
  games = fakeLoadController(gamesState);
  section = createFilterSortBar({ categories, games });
  document.body.append(section);
}

function chips(): HTMLButtonElement[] {
  return [...section.querySelectorAll<HTMLButtonElement>('.filter-chips__chip')];
}

function chip(label: string): HTMLButtonElement {
  const element = chips().find(({ textContent }) => textContent === label);
  if (!element) {
    throw new Error(`missing chip: ${label}`);
  }
  return element;
}

function pressedChip(): (string | null)[] {
  return chips()
    .filter((element) => element.getAttribute('aria-pressed') === 'true')
    .map(({ textContent }) => textContent);
}

function sortTrigger(): HTMLButtonElement {
  const trigger = section.querySelector<HTMLButtonElement>('.sort-dropdown__trigger');
  if (!trigger) {
    throw new Error('missing sort trigger');
  }
  return trigger;
}

function sortLabel(): string | null | undefined {
  return section.querySelector('.sort-dropdown__label')?.textContent;
}

function chooseSort(label: string): void {
  sortTrigger().click();
  [...section.querySelectorAll<HTMLElement>('[role="option"]')]
    .find(({ textContent }) => textContent === label)
    ?.click();
}

function categoriesArea(): HTMLElement {
  const area = section.querySelector<HTMLElement>('.filter-sort-bar__categories');
  if (!area) {
    throw new Error('missing categories area');
  }
  return area;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('layout', () => {
  it('is a labelled section with the categories before the sort control', async () => {
    await mount();

    expect(section.getAttribute('aria-label')).toBe('Filter and sort games');
    expect([...section.children].map(({ className }) => className)).toStrictEqual([
      'filter-sort-bar__categories',
      'sort-dropdown',
    ]);
  });
});

describe('categories', () => {
  it('shows seven busy chip placeholders while loading', async () => {
    await mount('/library', { categoriesState: { status: loading } });

    expect(categoriesArea().getAttribute('aria-busy')).toBe('true');
    expect(categoriesArea().querySelectorAll('.filter-chips__skeleton')).toHaveLength(7);
  });

  it('shows the API categories with the default chip pressed when the URL has no category', async () => {
    await mount();

    expect(categoriesArea().getAttribute('aria-busy')).toBe('false');
    expect(chips().map(({ textContent }) => textContent)).toStrictEqual(['All', 'Puzzle', 'Card']);
    expect(pressedChip()).toStrictEqual(['All']);
  });

  it('presses the category from the URL', async () => {
    await mount('/library?category=puzzle');

    expect(pressedChip()).toStrictEqual(['Puzzle']);
  });

  it('explains that filters are unavailable when the API has no categories', async () => {
    await mount('/library', { categoriesState: { status: empty } });

    expect(categoriesArea().querySelector('.empty-state__title')?.textContent).toBe(
      'No categories',
    );
    expect(categoriesArea().querySelector('.empty-state__message')?.textContent).toBe(
      'Filters are unavailable, but all games are still listed.',
    );
  });

  it('shows an error banner whose Retry reloads the categories', async () => {
    const retry = vi.fn<() => void>();
    await mount('/library', {
      categoriesState: { status: errorStatus, message: 'Categories are unavailable.', retry },
    });
    const banner = categoriesArea().querySelector('.error-banner');

    banner?.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();

    expect(banner?.querySelector('.error-banner__title')?.textContent).toBe(
      'Could not load categories',
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('swaps the placeholders for chips when the categories arrive', async () => {
    await mount('/library', { categoriesState: { status: loading } });

    categories.emit(LOADED_CATEGORIES);

    expect(categoriesArea().querySelector('.filter-chips__skeleton')).toBeNull();
    expect(pressedChip()).toStrictEqual(['All']);
  });
});

describe('choosing a category', () => {
  it('writes the category to the URL, keeps the sort, and resets the page', async () => {
    await mount('/library?sort=name-asc&page=3');
    const { length } = globalThis.history;

    chip('Puzzle').click();

    expect(currentUrl()).toBe('/library?sort=name-asc&category=puzzle');
    expect(globalThis.history.length).toBe(length + 1);
    expect(libraryQuery.getLibraryQuery()).toStrictEqual({
      page: 1,
      category: 'puzzle',
      sort: 'name-asc',
    });
  });

  it('presses the new chip once the URL has changed', async () => {
    await mount();

    chip('Card').click();

    expect(pressedChip()).toStrictEqual(['Card']);
  });

  it('does nothing when the pressed chip is clicked again', async () => {
    await mount('/library?category=puzzle');
    const { length } = globalThis.history;

    chip('Puzzle').click();

    expect(globalThis.history.length).toBe(length);
  });

  it('ignores a chip whose slug the API does not accept as a category', async () => {
    await mount('/library', {
      categoriesState: {
        status: success,
        data: [
          ...CATEGORY_LIST,
          makeCategory({ slug: 'racing', label: 'Racing', isDefault: false }),
        ],
      },
    });
    const { length } = globalThis.history;

    chip('Racing').click();

    expect(currentUrl()).toBe('/library');
    expect(globalThis.history.length).toBe(length);
  });

  it('follows the URL on Back / Forward', async () => {
    await mount('/library?category=puzzle&sort=name-asc');

    globalThis.history.replaceState(undefined, '', '/library?category=card');
    libraryQuery.syncLibraryQueryFromLocation();

    expect(pressedChip()).toStrictEqual(['Card']);
    expect(sortLabel()).toBe('Sort by: Rating ↓');
  });
});

describe('sorting', () => {
  it('shows the sort from the URL', async () => {
    await mount('/library?sort=name-desc');

    expect(sortLabel()).toBe('Sort by: Name Z→A');
  });

  it('writes the sort to the URL, keeps the category, and resets the page', async () => {
    await mount('/library?category=puzzle&page=2');
    const { length } = globalThis.history;

    chooseSort('Name A→Z');

    expect(currentUrl()).toBe('/library?category=puzzle&sort=name-asc');
    expect(globalThis.history.length).toBe(length + 1);
    expect(sortLabel()).toBe('Sort by: Name A→Z');
  });

  it.each([
    {
      name: 'leaves a disabled control as it was while games load',
      state: { status: loading },
      disabled: true,
    },
    {
      name: 'disables sorting for a single game',
      state: { status: success, data: [makeGame()], meta: makeGamesMeta({ totalItems: 1 }) },
      disabled: true,
    },
    { name: 'enables sorting for several games', state: LOADED_GAMES, disabled: false },
    {
      name: 'counts the returned games when there is no meta',
      state: { status: success, data: [makeGame({ slug: 'a' }), makeGame({ slug: 'b' })] },
      disabled: false,
    },
    { name: 'disables sorting for an empty result', state: { status: empty }, disabled: true },
    {
      name: 'keeps sorting available after an error',
      state: { status: errorStatus, message: 'Failed.', retry: vi.fn() },
      disabled: false,
    },
  ] satisfies { name: string; state: LibraryGamesState; disabled: boolean }[])(
    '$name',
    async ({ state, disabled }) => {
      await mount('/library', { gamesState: { status: empty } });

      games.emit(state);

      expect(sortTrigger().disabled).toBe(disabled);
    },
  );

  it('leaves an enabled control as it was while the next games load', async () => {
    await mount('/library', { gamesState: LOADED_GAMES });

    games.emit({ status: loading });

    expect(sortTrigger().disabled).toBe(false);
  });
});

describe('unmounting', () => {
  it('stops following categories, games, and the URL', async () => {
    await mount('/library', { categoriesState: { status: loading } });
    section.remove();
    await Promise.resolve();
    await Promise.resolve();

    categories.emit(LOADED_CATEGORIES);
    games.emit({ status: empty });
    libraryQuery.navigateLibrarySort('name-asc');

    expect(categoriesArea().querySelector('.filter-chips__skeleton')).not.toBeNull();
    expect(sortTrigger().disabled).toBe(false);
    expect(sortLabel()).toBe('Sort by: Rating ↓');
  });

  it('stops the sort control from listening to the page', async () => {
    await mount();
    sortTrigger().click();
    section.remove();
    await Promise.resolve();
    await Promise.resolve();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(sortTrigger().getAttribute('aria-expanded')).toBe('true');
  });
});
