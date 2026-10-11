// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { currentUrl, goBack, goForward } from '../test-support/history';
import { APP_PAGE, type AppPage } from '../utils/app-page';
import { AUTH_DIALOG_MODE } from '../utils/auth-dialog-query';
import { SESSION_STATUS } from './session-store';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { home, library, notFound } = APP_PAGE;
const { login } = AUTH_DIALOG_MODE;
const { guest } = SESSION_STATUS;

const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;

let navigation: typeof import('./navigation-store');
let libraryQuery: typeof import('./library-query-store');
let gameDialog: typeof import('./game-details-dialog-store');
let authDialog: typeof import('./auth-dialog-store');
let session: typeof import('./session-store');
let scrollTo: MockInstance<typeof globalThis.scrollTo>;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

/** The stores read the URL once at import, so each test sets its URL before loading them. */
async function loadStoresAt(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('./session-store');
  libraryQuery = await import('./library-query-store');
  gameDialog = await import('./game-details-dialog-store');
  authDialog = await import('./auth-dialog-store');
  navigation = await import('./navigation-store');
}

function subscribeListener(): MockInstance<(page: AppPage) => void> {
  const listener = vi.fn<(page: AppPage) => void>();
  navigation.subscribeNavigation(listener);
  listener.mockClear();
  return listener;
}

function expireSession(): void {
  session.startSession({ email: 'student@rs.school', displayName: 'Student' });
  vi.setSystemTime(NOW + TTL_MS);
}

type HistoryStep = { url: string; page: AppPage; category?: string; slug?: string };

function expectStep({ url, page, category, slug }: HistoryStep): void {
  expect(currentUrl()).toBe(url);
  expect(navigation.getCurrentPage()).toBe(page);
  expect(libraryQuery.getLibraryQuery().category).toBe(category);
  expect(gameDialog.getGameDetailsDialogState().slug).toBe(slug);
}

/** Mirrors the router: `popstate` re-reads the URL into every store. */
function syncOnPopState(): void {
  navigation.syncPageFromLocation();
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

describe('initial page', () => {
  it.each([
    { name: 'the root', url: '/', page: home },
    { name: 'the /home alias', url: '/home', page: home },
    { name: 'Library', url: '/library?category=card', page: library },
    { name: 'a trailing Library segment', url: '/library/x', page: notFound },
    { name: 'an unknown path', url: '/unknown', page: notFound },
    { name: 'a malformed encoding', url: '/%E0%A4%A', page: notFound },
  ])('resolves $name', async ({ url, page }) => {
    await loadStoresAt(url);

    expect(navigation.getCurrentPage()).toBe(page);
  });
});

describe('subscribeNavigation', () => {
  it('calls the listener with the current page right away and stops after unsubscribe', async () => {
    await loadStoresAt('/library');
    const listener = vi.fn();

    const unsubscribe = navigation.subscribeNavigation(listener);
    unsubscribe();
    navigation.navigate(home);

    expect(listener).toHaveBeenCalledExactlyOnceWith(library);
  });
});

describe('navigate', () => {
  it('pushes the page URL, notifies, and scrolls to the top', async () => {
    await loadStoresAt('/');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    navigation.navigate(library);

    expect(currentUrl()).toBe('/library');
    expect(globalThis.history.length).toBe(length + 1);
    expect(navigation.getCurrentPage()).toBe(library);
    expect(listener).toHaveBeenCalledExactlyOnceWith(library);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 });
  });

  it('does nothing for the current page', async () => {
    await loadStoresAt('/library?category=card');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    navigation.navigate(library);

    expect(currentUrl()).toBe('/library?category=card');
    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('closes open dialogs on the way to another page', async () => {
    await loadStoresAt('/?game=cat-mail-co&auth=login');
    navigation.syncPageFromLocation();

    navigation.navigate(library);

    expect(gameDialog.getGameDetailsDialogState().slug).toBeUndefined();
    expect(authDialog.getAuthDialogState().mode).toBeUndefined();
  });

  it('resets the Library query when leaving Library', async () => {
    await loadStoresAt('/library?category=card&page=2');

    navigation.navigate(home);

    expect(currentUrl()).toBe('/');
    expect(libraryQuery.getLibraryQuery()).toEqual({ page: 1, sort: 'rating-desc' });
  });

  it('leaves the 404 view for Home', async () => {
    await loadStoresAt('/unknown');

    navigation.navigate(home);

    expect(currentUrl()).toBe('/');
    expect(navigation.getCurrentPage()).toBe(home);
  });

  it('ends an expired session and still navigates in Guest Mode', async () => {
    await loadStoresAt('/');
    expireSession();

    navigation.navigate(library);

    expect(session.getSession().status).toBe(guest);
    expect(navigation.getCurrentPage()).toBe(library);
  });

  it('ends an expired session when the current page is chosen again', async () => {
    await loadStoresAt('/library');
    expireSession();

    navigation.navigate(library);

    expect(session.getSession().status).toBe(guest);
  });

  it.each([
    { name: 'dev', base: '/' },
    { name: 'production', base: '/minigames/' },
  ])('builds page URLs under the $name base', async ({ base }) => {
    vi.stubEnv('BASE_URL', base);
    await loadStoresAt(base);

    navigation.navigate(library);

    expect(currentUrl()).toBe(`${base}library`);
    expect(navigation.getCurrentPage()).toBe(library);
  });
});

describe('syncPageFromLocation', () => {
  it('restores page, Library query, and both dialogs from a deep link', async () => {
    await loadStoresAt('/library?category=card&sort=name-asc&page=2&game=cat-mail-co&auth=login');

    navigation.syncPageFromLocation();

    expect(navigation.getCurrentPage()).toBe(library);
    expect(libraryQuery.getLibraryQuery()).toEqual({ page: 2, category: 'card', sort: 'name-asc' });
    expect(gameDialog.getGameDetailsDialogState().slug).toBe('cat-mail-co');
    expect(authDialog.getAuthDialogState().mode).toBe(login);
  });

  it('keeps an unknown URL as typed and shows the 404 view', async () => {
    await loadStoresAt('/');
    globalThis.history.pushState(undefined, '', '/page/abc?x=1');
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    navigation.syncPageFromLocation();

    expect(navigation.getCurrentPage()).toBe(notFound);
    expect(currentUrl()).toBe('/page/abc?x=1');
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('ends an expired session before the restored page renders', async () => {
    await loadStoresAt('/');
    expireSession();
    const statusWhenRendered: string[] = [];
    navigation.subscribeNavigation(() => statusWhenRendered.push(session.getSession().status));
    globalThis.history.pushState(undefined, '', '/library');

    navigation.syncPageFromLocation();

    expect(navigation.getCurrentPage()).toBe(library);
    expect(statusWhenRendered.at(-1)).toBe(guest);
  });

  it('does not re-render the page when only the query changes', async () => {
    await loadStoresAt('/library');
    const listener = subscribeListener();
    globalThis.history.pushState(undefined, '', '/library?category=card&game=cat-mail-co');

    navigation.syncPageFromLocation();

    expect(libraryQuery.getLibraryQuery().category).toBe('card');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Back / Forward across pages and dialogs', () => {
  it('restores page, Library query, and dialog at every step, both ways', async () => {
    await loadStoresAt('/');
    globalThis.addEventListener('popstate', syncOnPopState);
    navigation.navigate(library);
    libraryQuery.navigateLibraryCategory('card');
    gameDialog.openGameDetailsDialog('cat-mail-co');
    gameDialog.closeGameDetailsDialog();
    navigation.navigate(home);
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    const start: HistoryStep = { url: '/', page: home };
    const onLibrary: HistoryStep = { url: '/library', page: library };
    const filtered: HistoryStep = {
      url: '/library?category=card',
      page: library,
      category: 'card',
    };
    const opened: HistoryStep = {
      url: '/library?category=card&game=cat-mail-co',
      page: library,
      category: 'card',
      slug: 'cat-mail-co',
    };

    for (const step of [filtered, opened, filtered, onLibrary, start]) {
      await goBack();
      expectStep(step);
    }
    for (const step of [onLibrary, filtered, opened, filtered, start]) {
      await goForward();
      expectStep(step);
    }

    expect(pushState).not.toHaveBeenCalled();
  });
});
