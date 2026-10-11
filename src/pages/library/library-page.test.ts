// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryItem } from '../../services/games-api-provider';
import { makeCategory, makeGame, makeGamesMeta } from '../../test-support/api-factories';
import { jsonResponse, stubFetch, type FetchMock } from '../../test-support/fetch-stub';
import { currentUrl, goBack } from '../../test-support/history';
import { stubMediaQuery } from '../../test-support/media-query';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

type NavigationStore = typeof import('../../store/navigation-store');
type Route = (url: URL, init?: RequestInit) => Promise<Response>;

const CATEGORY_LIST: CategoryItem[] = [
  makeCategory({ slug: 'all', label: 'All', isDefault: true }),
  makeCategory({ slug: 'puzzle', label: 'Puzzle', isDefault: false }),
  makeCategory({ slug: 'card', label: 'Card', isDefault: false }),
];

let container: HTMLElement;
let fetchMock: FetchMock;
let navigation: NavigationStore;
let routes: { games: Route; categories: Route };

function respondJson(body: unknown, status = 200): Route {
  return () => Promise.resolve(jsonResponse(body, status));
}

function gamesPage(page: number, totalPages = 4): Route {
  return respondJson({
    data: [makeGame({ slug: `game-${page}`, name: `Game on page ${page}` })],
    meta: makeGamesMeta({ page, totalPages, totalItems: totalPages * 6 }),
  });
}

/** Never answers; rejects like real `fetch` once its request is aborted. */
const pendingUntilAborted: Route = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function stubApi(): void {
  fetchMock = stubFetch((input, init) => {
    const url = new URL(String(input));
    return url.pathname.endsWith('/categories')
      ? routes.categories(url, init)
      : routes.games(url, init);
  });
}

function requestsTo(
  path: string,
): { query: Record<string, string>; signal?: AbortSignal | null }[] {
  return fetchMock.mock.calls
    .map(([input, init]) => ({ url: new URL(String(input)), signal: init?.signal }))
    .filter(({ url }) => url.pathname === path)
    .map(({ url, signal }) => ({ query: Object.fromEntries(url.searchParams), signal }));
}

function gamesQueries(): Record<string, string>[] {
  return requestsTo('/api/games').map(({ query }) => query);
}

async function settle(): Promise<void> {
  for (let step = 0; step < 3; step += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

async function openLibrary(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  navigation = await import('../../store/navigation-store');
  const { renderLibraryPage } = await import('./library-page');
  container = document.createElement('main');
  document.body.append(container);
  renderLibraryPage(container);
  await settle();
}

function query<T extends Element>(selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function chip(label: string): HTMLButtonElement {
  const element = [...container.querySelectorAll<HTMLButtonElement>('.filter-chips__chip')].find(
    ({ textContent }) => textContent === label,
  );
  if (!element) {
    throw new Error(`missing chip: ${label}`);
  }
  return element;
}

function pageButton(page: number): HTMLButtonElement {
  return query<HTMLButtonElement>(`.pagination__button--page[aria-label="Page ${page}"]`);
}

function pressedChip(): string | null | undefined {
  return container.querySelector('.filter-chips__chip[aria-pressed="true"]')?.textContent;
}

function syncOnPopState(): void {
  navigation.syncPageFromLocation();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_MOCK', '');
  stubMediaQuery(true);
  vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
  routes = {
    games: gamesPage(1),
    categories: respondJson({
      data: CATEGORY_LIST,
      meta: { totalItems: CATEGORY_LIST.length, description: 'Game categories' },
    }),
  };
  stubApi();
});

afterEach(() => {
  globalThis.removeEventListener('popstate', syncOnPopState);
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('layout', () => {
  it('renders the title, filter bar, games, and pagination in order', async () => {
    await openLibrary('/library');

    expect(container.className).toBe('library-page');
    expect([...container.children].map(({ className }) => className)).toStrictEqual([
      'page-title',
      'filter-sort-bar',
      'game-cards',
      'pagination',
    ]);
    expect(query('h1').textContent).toBe('Game Library');
  });
});

describe('deep links', () => {
  it('requests the first page, default sort, and every category for a bare Library URL', async () => {
    await openLibrary('/library');

    expect(gamesQueries()).toStrictEqual([
      { page: '1', limit: '6', category: 'all', sort: 'rating-desc' },
    ]);
    expect(requestsTo('/api/categories')).toHaveLength(1);
  });

  it('restores category, sort, and page from the URL in both the request and the controls', async () => {
    routes.games = gamesPage(2);

    await openLibrary('/library?category=puzzle&sort=name-asc&page=2');

    expect(gamesQueries()).toStrictEqual([
      { page: '2', limit: '6', category: 'puzzle', sort: 'name-asc' },
    ]);
    expect(pressedChip()).toBe('Puzzle');
    expect(query('.sort-dropdown__label').textContent).toBe('Sort by: Name A→Z');
    expect(query('[aria-current="page"]').textContent).toBe('2');
    expect(query('.game-card__title').textContent).toBe('Game on page 2');
  });
});

describe('changing the query', () => {
  it('requests the chosen category from the first page and keeps the categories', async () => {
    await openLibrary('/library?sort=name-asc&page=3');

    chip('Card').click();
    await settle();

    expect(currentUrl()).toBe('/library?sort=name-asc&category=card');
    expect(gamesQueries().at(-1)).toStrictEqual({
      page: '1',
      limit: '6',
      category: 'card',
      sort: 'name-asc',
    });
    expect(requestsTo('/api/categories')).toHaveLength(1);
  });

  it('requests the clicked page and scrolls to the top', async () => {
    await openLibrary('/library?category=puzzle');
    routes.games = gamesPage(3);

    pageButton(3).click();
    await settle();

    expect(currentUrl()).toBe('/library?category=puzzle&page=3');
    expect(gamesQueries().at(-1)).toStrictEqual({
      page: '3',
      limit: '6',
      category: 'puzzle',
      sort: 'rating-desc',
    });
    expect(globalThis.scrollTo).toHaveBeenCalledWith({ top: 0 });
    expect(query('[aria-current="page"]').textContent).toBe('3');
  });

  it('cancels a request that a newer choice replaced', async () => {
    await openLibrary('/library');
    routes.games = pendingUntilAborted;

    chip('Puzzle').click();
    chip('Card').click();
    await settle();

    const [, puzzle, card] = requestsTo('/api/games');
    expect(puzzle?.query.category).toBe('puzzle');
    expect(puzzle?.signal?.aborted).toBe(true);
    expect(card?.signal?.aborted).toBe(false);
  });

  it('goes back to the previous query and its games on Back', async () => {
    await openLibrary('/library');
    globalThis.addEventListener('popstate', syncOnPopState);
    chip('Puzzle').click();
    await settle();

    await goBack();
    await settle();

    expect(currentUrl()).toBe('/library');
    expect(pressedChip()).toBe('All');
    expect(gamesQueries()).toStrictEqual([
      { page: '1', limit: '6', category: 'all', sort: 'rating-desc' },
      { page: '1', limit: '6', category: 'puzzle', sort: 'rating-desc' },
      { page: '1', limit: '6', category: 'all', sort: 'rating-desc' },
    ]);
  });
});

describe('errors', () => {
  it('shows the rate-limit message and retries the same request once on Retry', async () => {
    routes.games = respondJson({ error: 'Too many requests. Please slow down.' }, 429);
    await openLibrary('/library?category=card&page=2');

    expect(query('.game-cards .error-banner__message').textContent).toBe(
      'Too many requests. Please slow down.',
    );
    expect(gamesQueries()).toHaveLength(1);

    routes.games = gamesPage(2);
    query<HTMLButtonElement>('.game-cards .error-banner__retry').click();
    await settle();

    expect(gamesQueries()).toStrictEqual([
      { page: '2', limit: '6', category: 'card', sort: 'rating-desc' },
      { page: '2', limit: '6', category: 'card', sort: 'rating-desc' },
    ]);
    expect(query('.game-card__title').textContent).toBe('Game on page 2');
  });
});

describe('leaving the page', () => {
  it('cancels its pending requests once the page is swapped out', async () => {
    routes.games = pendingUntilAborted;
    routes.categories = pendingUntilAborted;
    await openLibrary('/library');

    container.replaceChildren();
    await settle();

    expect(requestsTo('/api/games').map(({ signal }) => signal?.aborted)).toStrictEqual([true]);
    expect(requestsTo('/api/categories').map(({ signal }) => signal?.aborted)).toStrictEqual([
      true,
    ]);
  });
});
