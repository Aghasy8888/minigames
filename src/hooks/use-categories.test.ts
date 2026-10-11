// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { CategoriesMeta } from '../services/categories-types';
import { makeCategory } from '../test-support/api-factories';
import { currentUrl } from '../test-support/history';
import {
  jsonResponse,
  sentRequest,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import { LOAD_STATUS } from './use-load-state';
import type { CategoriesController, CategoriesState } from './use-categories';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const FALLBACK_MESSAGE = 'Categories are unavailable right now. Please try again.';
const ALL = makeCategory({ slug: 'all', label: 'All', isDefault: false });
const PUZZLE = makeCategory({ slug: 'puzzle', label: 'Puzzle', isDefault: true });
const CARD = makeCategory({ slug: 'card', label: 'Card', isDefault: false });

let hook: typeof import('./use-categories');
let libraryQuery: typeof import('../store/library-query-store');
let snackbars: typeof import('../store/snackbar-store');
let addListenerSpy: MockInstance<typeof document.addEventListener>;
const controllers: CategoriesController[] = [];

function makeMeta(totalItems: number): CategoriesMeta {
  return { totalItems, description: 'Game categories' };
}

/** The Library store reads the URL once at import, so each test sets its URL before loading it. */
async function loadAt(url: string): Promise<void> {
  globalThis.history.replaceState(undefined, '', url);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  libraryQuery = await import('../store/library-query-store');
  snackbars = await import('../store/snackbar-store');
  hook = await import('./use-categories');
}

function createCategories(): CategoriesController {
  const controller = hook.useCategories();
  controllers.push(controller);
  return controller;
}

async function waitForStatus(
  controller: CategoriesController,
  status: CategoriesState['status'],
): Promise<void> {
  await vi.waitFor(() => expect(controller.getState().status).toBe(status));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  addListenerSpy = vi.spyOn(document, 'addEventListener');
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

describe('findDefaultCategory', () => {
  it.each([
    { name: 'the flagged category', categories: [ALL, PUZZLE, CARD], expected: PUZZLE },
    { name: 'the first category when none is flagged', categories: [CARD, ALL], expected: CARD },
    { name: 'nothing for an empty list', categories: [], expected: undefined },
  ])('picks $name', async ({ categories, expected }) => {
    await loadAt('/library');

    expect(hook.findDefaultCategory(categories)).toBe(expected);
  });
});

describe('useCategories', () => {
  it('sends one GET /api/categories without query params', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ data: [ALL, PUZZLE], meta: makeMeta(2) });

    const categories = createCategories();
    await waitForStatus(categories, success);

    expect(fetchMock).toHaveBeenCalledOnce();
    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/categories`);
  });

  it('exposes the categories and records the API default chip', async () => {
    await loadAt('/library');
    const meta = makeMeta(3);
    stubFetchJson({ data: [ALL, PUZZLE, CARD], meta });

    const categories = createCategories();
    await waitForStatus(categories, success);

    expect(categories.getState()).toStrictEqual({
      status: success,
      data: [ALL, PUZZLE, CARD],
      meta,
    });
    expect(libraryQuery.getDefaultCategory()).toBe('puzzle');
    expect(libraryQuery.getResolvedCategory()).toBe('puzzle');
  });

  it('drops a URL category the API does not list, in place', async () => {
    await loadAt('/library?category=farm&sort=name-asc');
    stubFetchJson({ data: [ALL, PUZZLE, CARD], meta: makeMeta(3) });
    const { length } = globalThis.history;

    const categories = createCategories();
    await waitForStatus(categories, success);

    expect(currentUrl()).toBe('/library?sort=name-asc');
    expect(globalThis.history.length).toBe(length);
  });

  it('keeps a URL category the API lists', async () => {
    await loadAt('/library?category=card');
    stubFetchJson({ data: [ALL, PUZZLE, CARD], meta: makeMeta(3) });

    const categories = createCategories();
    await waitForStatus(categories, success);

    expect(currentUrl()).toBe('/library?category=card');
    expect(libraryQuery.getResolvedCategory()).toBe('card');
  });

  it('shows the empty state and records no default for an empty list', async () => {
    await loadAt('/library');
    stubFetchJson({ data: [], meta: makeMeta(0) });

    const categories = createCategories();
    await waitForStatus(categories, empty);

    expect(libraryQuery.getDefaultCategory()).toBeUndefined();
  });

  it.each([
    { name: 'a 500', status: 500, error: 'Internal error', message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      status: 429,
      error: 'Too many requests, please try again later.',
      message: 'Too many requests, please try again later.',
    },
  ])(
    'shows a readable error for $name and records no default',
    async ({ status, error, message }) => {
      await loadAt('/library');
      stubFetchJson({ error }, status);

      const categories = createCategories();
      await waitForStatus(categories, errorStatus);

      expect(categories.getState()).toMatchObject({ status: errorStatus, message });
      expect(libraryQuery.getDefaultCategory()).toBeUndefined();
    },
  );

  it('records the default after a successful Retry and confirms it', async () => {
    await loadAt('/library');
    const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
    const categories = createCategories();
    await waitForStatus(categories, errorStatus);

    const state = categories.getState();

    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [ALL, PUZZLE], meta: makeMeta(2) })),
    );
    if (state.status === errorStatus) {
      state.retry();
    }
    expect(categories.getState()).toStrictEqual({ status: loading });
    await waitForStatus(categories, success);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(libraryQuery.getDefaultCategory()).toBe('puzzle');
    expect(
      snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message })),
    ).toStrictEqual([{ variant: 'success', message: 'Categories loaded' }]);
  });

  it('records nothing once destroyed', async () => {
    await loadAt('/library');
    const { fetchMock, respond } = stubPendingFetch();
    const categories = createCategories();

    categories.destroy();
    respond(jsonResponse({ data: [ALL, PUZZLE], meta: makeMeta(2) }));
    await vi.advanceTimersByTimeAsync(0);

    expect(sentRequest(fetchMock).signal?.aborted).toBe(true);
    expect(libraryQuery.getDefaultCategory()).toBeUndefined();
  });
});
