// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { GAME_CATEGORIES } from '../services/games-types';
import { currentUrl, goBack, goForward } from '../test-support/history';
import { SESSION_STATUS } from './session-store';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { guest } = SESSION_STATUS;

const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;
const API_CATEGORY_SLUGS: readonly string[] = GAME_CATEGORIES;

let store: typeof import('./library-query-store');
let session: typeof import('./session-store');
let scrollTo: MockInstance<typeof globalThis.scrollTo>;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

/** The store reads the URL once at import, so each test sets its URL before loading it. */
async function loadStoreAt(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('./session-store');
  store = await import('./library-query-store');
}

function subscribeListener(): MockInstance<(query: object) => void> {
  const listener = vi.fn();
  store.subscribeLibraryQuery(listener);
  return listener;
}

/** Mirrors the router: `popstate` re-reads the URL into the Library query store. */
function syncOnPopState(): void {
  store.syncLibraryQueryFromLocation();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  scrollTo = vi.spyOn(globalThis, 'scrollTo');
});

afterEach(() => {
  globalThis.removeEventListener('popstate', syncOnPopState);
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('initial query', () => {
  it.each([
    {
      name: 'every Library param',
      url: '/library?category=puzzle&sort=name-asc&page=2',
      query: { page: 2, category: 'puzzle', sort: 'name-asc' },
    },
    { name: 'plain Library', url: '/library', query: { page: 1, sort: 'rating-desc' } },
    {
      name: 'Library params on Home',
      url: '/?category=puzzle&page=2',
      query: { page: 1, sort: 'rating-desc' },
    },
  ])('reads $name from the URL', async ({ url, query }) => {
    await loadStoreAt(url);

    expect(store.getLibraryQuery()).toEqual(query);
  });
});

describe('getResolvedCategory', () => {
  it.each([
    {
      name: 'the URL category',
      url: '/library?category=card',
      apiDefault: 'puzzle',
      resolved: 'card',
    },
    { name: 'the API default chip', url: '/library', apiDefault: 'puzzle', resolved: 'puzzle' },
    { name: 'the no-filter value', url: '/library', apiDefault: undefined, resolved: 'all' },
  ])('resolves to $name', async ({ url, apiDefault, resolved }) => {
    await loadStoreAt(url);

    store.setDefaultCategory(apiDefault, API_CATEGORY_SLUGS);

    expect(store.getResolvedCategory()).toBe(resolved);
  });
});

describe('navigateLibraryPage', () => {
  it('pushes the page, keeps category and sort, notifies, and scrolls to the top', async () => {
    await loadStoreAt('/library?category=puzzle&sort=name-asc');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibraryPage(3);

    expect(currentUrl()).toBe('/library?category=puzzle&sort=name-asc&page=3');
    expect(globalThis.history.length).toBe(length + 1);
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      page: 3,
      category: 'puzzle',
      sort: 'name-asc',
    });
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
  });

  it.each([
    { name: 'the first page', page: 1, url: '/library', expected: 1 },
    { name: 'zero', page: 0, url: '/library', expected: 1 },
    { name: 'a negative page', page: -2, url: '/library', expected: 1 },
    { name: 'a fractional page', page: 2.7, url: '/library?page=2', expected: 2 },
  ])('turns $name into a whole page of at least 1', async ({ page, url, expected }) => {
    await loadStoreAt('/library?page=3');

    store.navigateLibraryPage(page);

    expect(currentUrl()).toBe(url);
    expect(store.getLibraryQuery().page).toBe(expected);
  });

  it('does nothing for the current page', async () => {
    await loadStoreAt('/library?page=2');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibraryPage(2);

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('navigateLibraryCategory', () => {
  it('pushes the category, drops the page, and keeps the sort without scrolling', async () => {
    await loadStoreAt('/library?sort=name-asc&page=3');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibraryCategory('farm');

    expect(currentUrl()).toBe('/library?sort=name-asc&category=farm');
    expect(globalThis.history.length).toBe(length + 1);
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      page: 1,
      category: 'farm',
      sort: 'name-asc',
    });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'the URL category', url: '/library?category=farm', category: 'farm' as const },
    { name: 'the no-filter value with no category', url: '/library', category: 'all' as const },
  ])('does nothing when $name is already selected', async ({ url, category }) => {
    await loadStoreAt(url);
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibraryCategory(category);

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
  });

  it('leaves the API default chip out of the URL', async () => {
    await loadStoreAt('/library?category=card&page=2');
    store.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);

    store.navigateLibraryCategory('puzzle');

    expect(currentUrl()).toBe('/library');
    expect(store.getLibraryQuery().category).toBeUndefined();
    expect(store.getResolvedCategory()).toBe('puzzle');
  });
});

describe('navigateLibrarySort', () => {
  it('pushes the sort, drops the page, and keeps the category', async () => {
    await loadStoreAt('/library?category=card&page=2');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibrarySort('name-desc');

    expect(currentUrl()).toBe('/library?category=card&sort=name-desc');
    expect(globalThis.history.length).toBe(length + 1);
    expect(listener).toHaveBeenCalledExactlyOnceWith({
      page: 1,
      category: 'card',
      sort: 'name-desc',
    });
  });

  it('leaves the default sort out of the URL', async () => {
    await loadStoreAt('/library?sort=name-asc');

    store.navigateLibrarySort('rating-desc');

    expect(currentUrl()).toBe('/library');
  });

  it('does nothing for the current sort', async () => {
    await loadStoreAt('/library?sort=name-asc&page=2');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.navigateLibrarySort('name-asc');

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('resetLibraryFilters', () => {
  it('drops the category and page but keeps the sort', async () => {
    await loadStoreAt('/library?category=card&sort=name-asc&page=2');
    const { length } = globalThis.history;

    store.resetLibraryFilters();

    expect(currentUrl()).toBe('/library?sort=name-asc');
    expect(globalThis.history.length).toBe(length + 1);
    expect(store.getLibraryQuery()).toEqual({ page: 1, sort: 'name-asc' });
  });
});

describe('expired session during Library navigation', () => {
  it('ends the session and still navigates in Guest Mode', async () => {
    await loadStoreAt('/library');
    session.startSession({ email: 'student@rs.school', displayName: 'Student' });
    vi.setSystemTime(NOW + TTL_MS);

    store.navigateLibraryPage(2);

    expect(session.getSession().status).toBe(guest);
    expect(currentUrl()).toBe('/library?page=2');
  });
});

describe('setDefaultCategory', () => {
  it('records the API default and notifies when the requested category changes', async () => {
    await loadStoreAt('/library');
    const listener = subscribeListener();
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    store.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);

    expect(store.getDefaultCategory()).toBe('puzzle');
    expect(listener).toHaveBeenCalledExactlyOnceWith({ page: 1, sort: 'rating-desc' });
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('does not notify when the URL category still decides the request', async () => {
    await loadStoreAt('/library?category=card');
    const listener = subscribeListener();

    store.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);

    expect(listener).not.toHaveBeenCalled();
  });

  it('drops a URL category equal to the default in place without notifying', async () => {
    await loadStoreAt('/library?category=puzzle&sort=name-asc');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);

    expect(currentUrl()).toBe('/library?sort=name-asc');
    expect(globalThis.history.length).toBe(length);
    expect(store.getLibraryQuery().category).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it('drops a URL category the API does not list and requests the default', async () => {
    await loadStoreAt('/library?category=farm');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    store.setDefaultCategory('puzzle', ['all', 'puzzle']);

    expect(currentUrl()).toBe('/library');
    expect(globalThis.history.length).toBe(length);
    expect(store.getResolvedCategory()).toBe('puzzle');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('keeps the URL category when the API list is empty', async () => {
    await loadStoreAt('/library?category=farm');

    store.setDefaultCategory(undefined, []);

    expect(currentUrl()).toBe('/library?category=farm');
    expect(store.getResolvedCategory()).toBe('farm');
  });

  it('ignores a default slug that is not a spec category', async () => {
    await loadStoreAt('/library');

    store.setDefaultCategory('racing', ['racing']);

    expect(store.getDefaultCategory()).toBeUndefined();
    expect(store.getResolvedCategory()).toBe('all');
  });
});

describe('syncLibraryQueryFromLocation', () => {
  it('resets the query without notifying when leaving Library', async () => {
    await loadStoreAt('/library?category=card&page=2');
    const listener = subscribeListener();

    globalThis.history.pushState(undefined, '', '/');
    store.syncLibraryQueryFromLocation();

    expect(store.getLibraryQuery()).toEqual({ page: 1, sort: 'rating-desc' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('applies a new Library URL and notifies once', async () => {
    await loadStoreAt('/library');
    const listener = subscribeListener();

    globalThis.history.pushState(undefined, '', '/library?category=card&page=2');
    store.syncLibraryQueryFromLocation();

    expect(listener).toHaveBeenCalledExactlyOnceWith({
      page: 2,
      category: 'card',
      sort: 'rating-desc',
    });
  });

  it('does not notify when the URL query is unchanged', async () => {
    await loadStoreAt('/library?category=card');
    const listener = subscribeListener();
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    store.syncLibraryQueryFromLocation();

    expect(listener).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'a non-numeric page', url: '/library?page=abc', canonical: '/library' },
    { name: 'an explicit first page', url: '/library?page=1', canonical: '/library' },
    { name: 'an unknown sort', url: '/library?sort=bogus&page=2', canonical: '/library?page=2' },
    { name: 'the default sort', url: '/library?sort=rating-desc', canonical: '/library' },
    { name: 'an unknown category', url: '/library?category=racing', canonical: '/library' },
    {
      name: 'an invalid page next to a dialog',
      url: '/library?page=0&game=cat-mail-co',
      canonical: '/library?game=cat-mail-co',
    },
  ])('normalizes $name with replaceState', async ({ url, canonical }) => {
    await loadStoreAt('/library');
    globalThis.history.pushState(undefined, '', url);
    const { length } = globalThis.history;
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    store.syncLibraryQueryFromLocation();

    expect(currentUrl()).toBe(canonical);
    expect(globalThis.history.length).toBe(length);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('drops the API default category from a restored URL', async () => {
    await loadStoreAt('/library');
    store.setDefaultCategory('puzzle', API_CATEGORY_SLUGS);
    globalThis.history.pushState(undefined, '', '/library?category=puzzle&sort=name-asc');

    store.syncLibraryQueryFromLocation();

    expect(currentUrl()).toBe('/library?sort=name-asc');
    expect(store.getLibraryQuery()).toEqual({ page: 1, sort: 'name-asc' });
  });
});

describe('Back / Forward through Library queries', () => {
  it('restores the URL and query at every step, both ways, without pushing', async () => {
    await loadStoreAt('/library');
    globalThis.addEventListener('popstate', syncOnPopState);
    store.navigateLibraryCategory('card');
    store.navigateLibrarySort('name-asc');
    store.navigateLibraryPage(2);
    const listener = subscribeListener();
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    const initial = { url: '/library', query: { page: 1, sort: 'rating-desc' } };
    const byCategory = {
      url: '/library?category=card',
      query: { page: 1, category: 'card', sort: 'rating-desc' },
    };
    const bySort = {
      url: '/library?category=card&sort=name-asc',
      query: { page: 1, category: 'card', sort: 'name-asc' },
    };
    const byPage = {
      url: '/library?category=card&sort=name-asc&page=2',
      query: { page: 2, category: 'card', sort: 'name-asc' },
    };
    for (const { url, query } of [bySort, byCategory, initial]) {
      await goBack();
      expect(currentUrl()).toBe(url);
      expect(store.getLibraryQuery()).toEqual(query);
    }
    for (const { url, query } of [byCategory, bySort, byPage]) {
      await goForward();
      expect(currentUrl()).toBe(url);
      expect(store.getLibraryQuery()).toEqual(query);
    }

    expect(listener).toHaveBeenCalledTimes(6);
    expect(pushState).not.toHaveBeenCalled();
  });
});

describe('subscribeLibraryQuery', () => {
  it('does not call the listener on subscribe and stops after unsubscribe', async () => {
    await loadStoreAt('/library');
    const listener = vi.fn();

    const unsubscribe = store.subscribeLibraryQuery(listener);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    store.navigateLibraryPage(2);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('base URL', () => {
  it.each([
    { name: 'dev', base: '/' },
    { name: 'production', base: '/minigames/' },
  ])('reads and writes Library URLs under the $name base', async ({ base }) => {
    vi.stubEnv('BASE_URL', base);
    await loadStoreAt(`${base}library?category=card`);

    store.navigateLibraryPage(2);

    expect(currentUrl()).toBe(`${base}library?category=card&page=2`);
    expect(store.getLibraryQuery()).toEqual({ page: 2, category: 'card', sort: 'rating-desc' });
  });
});
