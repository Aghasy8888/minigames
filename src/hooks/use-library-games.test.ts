// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { GAME_CATEGORIES } from '../services/games-types';
import { makeGame, makeGamesMeta } from '../test-support/api-factories';
import {
  jsonResponse,
  sentRequest,
  stubFetchJson,
  stubPendingFetch,
  type FetchMock,
} from '../test-support/fetch-stub';
import { LOAD_STATUS } from './use-load-state';
import type { LibraryGamesController, LibraryGamesState } from './use-library-games';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const FALLBACK_MESSAGE = 'Games are unavailable right now. Please try again.';
const API_CATEGORY_SLUGS: readonly string[] = GAME_CATEGORIES;

let hook: typeof import('./use-library-games');
let libraryQuery: typeof import('../store/library-query-store');
let navigation: typeof import('../store/navigation-store');
let addListenerSpy: MockInstance<typeof document.addEventListener>;
const controllers: LibraryGamesController[] = [];

/** The stores read the URL once at import, so each test sets its URL before loading them. */
async function loadAt(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  libraryQuery = await import('../store/library-query-store');
  navigation = await import('../store/navigation-store');
  hook = await import('./use-library-games');
}

function createGames(): LibraryGamesController {
  const controller = hook.useLibraryGames();
  controllers.push(controller);
  return controller;
}

function sentQuery(fetchMock: FetchMock, index = 0): Record<string, string> {
  return Object.fromEntries(sentRequest(fetchMock, index).url.searchParams);
}

async function waitForStatus(
  controller: LibraryGamesController,
  status: LibraryGamesState['status'],
): Promise<void> {
  await vi.waitFor(() => expect(controller.getState().status).toBe(status));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  vi.spyOn(globalThis, 'scrollTo');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('canSortLibraryGames', () => {
  const retry = (): void => undefined;

  it.each<{ name: string; state: LibraryGamesState; canSort: boolean | undefined }>([
    { name: 'loading', state: { status: loading }, canSort: undefined },
    {
      name: 'several games in total',
      state: { status: success, data: [makeGame()], meta: makeGamesMeta({ totalItems: 7 }) },
      canSort: true,
    },
    {
      name: 'a single game in total',
      state: { status: success, data: [makeGame()], meta: makeGamesMeta({ totalItems: 1 }) },
      canSort: false,
    },
    {
      name: 'two games without meta',
      state: { status: success, data: [makeGame(), makeGame({ slug: 'snake' })] },
      canSort: true,
    },
    {
      name: 'one game without meta',
      state: { status: success, data: [makeGame()] },
      canSort: false,
    },
    { name: 'empty', state: { status: empty }, canSort: false },
    {
      name: 'error',
      state: { status: errorStatus, message: FALLBACK_MESSAGE, retry },
      canSort: true,
    },
  ])('returns $canSort for $name', async ({ state, canSort }) => {
    await loadAt('/library');

    expect(hook.canSortLibraryGames(state)).toBe(canSort);
  });
});

describe('useLibraryGames', () => {
  it('requests the URL page, category, and sort with the Library page size', async () => {
    await loadAt('/library?category=card&sort=name-asc&page=2');
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });

    const games = createGames();
    await waitForStatus(games, success);

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(`${url.origin}${url.pathname}`).toBe(`${API_BASE_URL}/api/games`);
    expect(sentQuery(fetchMock)).toStrictEqual({
      page: '2',
      limit: '6',
      category: 'card',
      sort: 'name-asc',
    });
  });

  it('sends the no-filter category and defaults for a plain Library URL', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });

    const games = createGames();
    await waitForStatus(games, success);

    expect(sentQuery(fetchMock)).toStrictEqual({
      page: '1',
      limit: '6',
      category: 'all',
      sort: 'rating-desc',
    });
  });

  it('exposes the returned games and meta', async () => {
    await loadAt('/library');
    const data = [makeGame(), makeGame({ slug: 'snake' })];
    const meta = makeGamesMeta({ totalItems: 2, totalPages: 1 });
    stubFetchJson({ data, meta });

    const games = createGames();
    await waitForStatus(games, success);

    expect(games.getState()).toStrictEqual({ status: success, data, meta });
  });

  it('shows the empty state for a page with no games', async () => {
    await loadAt('/library?category=farm');
    stubFetchJson({ data: [], meta: makeGamesMeta({ totalItems: 0, totalPages: 0 }) });

    const games = createGames();

    await waitForStatus(games, empty);
  });

  it.each([
    {
      name: 'a 400',
      status: 400,
      error: 'Invalid sort parameter: bogus',
      message: FALLBACK_MESSAGE,
    },
    { name: 'a 500', status: 500, error: 'Internal error', message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      status: 429,
      error: 'Too many requests, please try again later.',
      message: 'Too many requests, please try again later.',
    },
  ])('shows a readable error for $name', async ({ status, error, message }) => {
    await loadAt('/library');
    stubFetchJson({ error }, status);

    const games = createGames();
    await waitForStatus(games, errorStatus);

    expect(games.getState()).toMatchObject({ status: errorStatus, message });
  });

  it.each([
    {
      name: 'category',
      change: (): void => libraryQuery.navigateLibraryCategory('puzzle'),
      query: { page: '1', limit: '6', category: 'puzzle', sort: 'name-asc' },
    },
    {
      name: 'sort',
      change: (): void => libraryQuery.navigateLibrarySort('name-desc'),
      query: { page: '1', limit: '6', category: 'card', sort: 'name-desc' },
    },
    {
      name: 'page',
      change: (): void => libraryQuery.navigateLibraryPage(3),
      query: { page: '3', limit: '6', category: 'card', sort: 'name-asc' },
    },
  ])('refetches with the new $name and aborts the previous request', async ({ change, query }) => {
    await loadAt('/library?category=card&sort=name-asc&page=2');
    const { fetchMock, respond } = stubPendingFetch();
    const games = createGames();

    change();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentRequest(fetchMock, 0).signal?.aborted).toBe(true);
    expect(sentQuery(fetchMock, 1)).toStrictEqual(query);
    expect(games.getState()).toStrictEqual({ status: loading });
    respond(jsonResponse({ data: [makeGame()], meta: makeGamesMeta() }));
    await waitForStatus(games, success);
  });

  it('refetches with the API default chip once categories arrive', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });
    const games = createGames();
    await waitForStatus(games, success);

    libraryQuery.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);
    await waitForStatus(games, success);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentQuery(fetchMock, 1).category).toBe('puzzle');
  });

  it('ignores query changes while another page is shown', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });
    const games = createGames();
    await waitForStatus(games, success);

    navigation.navigate('home');
    libraryQuery.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);

    expect(libraryQuery.getResolvedCategory()).toBe('puzzle');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('stops refetching after destroy', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ data: [makeGame()], meta: makeGamesMeta() });
    const games = createGames();
    await waitForStatus(games, success);

    games.destroy();
    libraryQuery.navigateLibraryPage(2);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
