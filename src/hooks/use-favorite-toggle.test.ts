// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER_EMAIL, makeFavoriteResult } from '../test-support/api-factories';
import {
  jsonResponse,
  sentRequest,
  stubFetch,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import { AUTH_DIALOG_MODE } from '../utils/auth-dialog-query';
import {
  FAVORITE_TOGGLE_STATUS,
  type FavoriteToggleController,
  type UseFavoriteToggleOptions,
} from './use-favorite-toggle';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle, pending } = FAVORITE_TOGGLE_STATUS;
const { login } = AUTH_DIALOG_MODE;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const SLUG = 'cat-mail-co';
const GAME_URL = `/library?game=${SLUG}`;
const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };

const GUEST_SNACKBAR = { variant: 'warning', message: 'Log in to add games to your favorites.' };
const EXPIRY_SNACKBAR = {
  variant: 'info',
  message: 'Your session has ended. Please log in again.',
};
const FALLBACK_ERROR_MESSAGE = 'Favorites could not be updated right now. Please try again.';
const UNCONFIRMED_MESSAGE =
  "Couldn't reach the server, so your favorites change wasn't confirmed. Check your connection and reopen the game before trying again.";

let hook: typeof import('./use-favorite-toggle');
let session: typeof import('../store/session-store');
let snackbars: typeof import('../store/snackbar-store');
let authDialog: typeof import('../store/auth-dialog-store');
const controllers: FavoriteToggleController[] = [];

function createToggle(overrides: Partial<UseFavoriteToggleOptions> = {}): FavoriteToggleController {
  const controller = hook.useFavoriteToggle({
    slug: SLUG,
    isFavorited: false,
    likesCount: 10,
    ...overrides,
  });
  controllers.push(controller);
  return controller;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function currentUrl(): string {
  const { pathname, search } = globalThis.location;
  return `${pathname}${search}`;
}

async function waitForSnackbar(): Promise<void> {
  await vi.waitFor(() => expect(snackbars.getSnackbars()).not.toHaveLength(0));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', GAME_URL);
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../store/session-store');
  snackbars = await import('../store/snackbar-store');
  authDialog = await import('../store/auth-dialog-store');
  hook = await import('./use-favorite-toggle');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useFavoriteToggle', () => {
  it('starts idle from the server-provided favorite state', () => {
    expect(createToggle({ isFavorited: true, likesCount: 7 }).getState()).toStrictEqual({
      status: idle,
      isFavorited: true,
      likesCount: 7,
    });
  });

  describe('without an active session', () => {
    it('sends nothing for a guest, opens Auth over the game, and warns once', () => {
      const fetchMock = stubFetchJson({ data: makeFavoriteResult() });
      const toggle = createToggle();
      const listener = vi.fn();
      toggle.subscribe(listener);

      toggle.toggle();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(authDialog.getAuthDialogState().mode).toBe(login);
      expect(shownSnackbars()).toStrictEqual([GUEST_SNACKBAR]);
    });

    it('sends nothing for an expired session and shows only the expiry Snackbar', async () => {
      const fetchMock = stubFetchJson({ data: makeFavoriteResult() });
      session.startSession(PROFILE);
      const toggle = createToggle();
      vi.setSystemTime(NOW + TTL_MS);

      toggle.toggle();
      await waitForSnackbar();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(toggle.getState()).toStrictEqual({ status: idle, isFavorited: false, likesCount: 10 });
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
    });
  });

  describe('with an active session', () => {
    beforeEach(() => {
      session.startSession(PROFILE);
    });

    it('posts the session email to the favorite endpoint', async () => {
      const fetchMock = stubFetchJson({ data: makeFavoriteResult() });
      const toggle = createToggle();

      toggle.toggle();
      await vi.waitFor(() => expect(toggle.getState().status).toBe(idle));

      const { url, method, contentType, body } = sentRequest(fetchMock);
      expect(url.href).toBe(`${API_BASE_URL}/api/games/${SLUG}/favorite`);
      expect(method).toBe('POST');
      expect(contentType).toBe('application/json');
      expect(body).toStrictEqual({ userEmail: TEST_USER_EMAIL });
    });

    it.each([
      {
        name: 'adds the game',
        isFavorited: false,
        result: { isFavorited: true, likesCount: 11 },
        message: 'Added to favorites',
      },
      {
        name: 'removes the game',
        isFavorited: true,
        result: { isFavorited: false, likesCount: 9 },
        message: 'Removed from favorites',
      },
    ])('$name using only the server response', async ({ isFavorited, result, message }) => {
      stubFetchJson({ data: makeFavoriteResult(result) });
      const toggle = createToggle({ isFavorited, likesCount: 10 });

      toggle.toggle();
      await vi.waitFor(() => expect(toggle.getState().status).toBe(idle));

      expect(toggle.getState()).toStrictEqual({ status: idle, ...result });
      expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message }]);
    });

    it('trusts the server even when it does not confirm a flip', async () => {
      stubFetchJson({ data: makeFavoriteResult({ isFavorited: false, likesCount: 12 }) });
      const toggle = createToggle({ isFavorited: false, likesCount: 10 });

      toggle.toggle();
      await vi.waitFor(() => expect(toggle.getState().status).toBe(idle));

      expect(toggle.getState()).toStrictEqual({ status: idle, isFavorited: false, likesCount: 12 });
    });

    it('locks while pending: state is unchanged and a second toggle sends nothing', async () => {
      const { fetchMock, respond } = stubPendingFetch();
      const toggle = createToggle();
      const listener = vi.fn();
      toggle.subscribe(listener);

      toggle.toggle();
      toggle.toggle();

      expect(toggle.getState()).toStrictEqual({
        status: pending,
        isFavorited: false,
        likesCount: 10,
      });
      expect(listener).toHaveBeenCalledExactlyOnceWith({
        status: pending,
        isFavorited: false,
        likesCount: 10,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      respond(jsonResponse({ data: makeFavoriteResult({ isFavorited: true, likesCount: 11 }) }));
      await vi.waitFor(() => expect(toggle.getState().status).toBe(idle));

      expect(listener).toHaveBeenLastCalledWith({
        status: idle,
        isFavorited: true,
        likesCount: 11,
      });
    });

    it.each([
      { name: '401', status: 401, error: 'userEmail is required', message: FALLBACK_ERROR_MESSAGE },
      {
        name: '404',
        status: 404,
        error: 'Game not found: cat-mail-co',
        message: FALLBACK_ERROR_MESSAGE,
      },
      { name: '500', status: 500, error: 'Internal error', message: FALLBACK_ERROR_MESSAGE },
      {
        name: '429',
        status: 429,
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
      },
    ])(
      'keeps the state and shows one error after a $name, without replaying',
      async ({ status, error, message }) => {
        const fetchMock = stubFetchJson({ error }, status);
        const toggle = createToggle();

        toggle.toggle();
        await waitForSnackbar();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(toggle.getState()).toStrictEqual({
          status: idle,
          isFavorited: false,
          likesCount: 10,
        });
        expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message }]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      },
    );

    it('reports a network failure as not confirmed, without replaying', async () => {
      const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
      const toggle = createToggle();

      toggle.toggle();
      await waitForSnackbar();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(toggle.getState()).toStrictEqual({ status: idle, isFavorited: false, likesCount: 10 });
      expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message: UNCONFIRMED_MESSAGE }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('unlocks after a failure so the user can try again explicitly', async () => {
      const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
      const toggle = createToggle();

      toggle.toggle();
      await waitForSnackbar();
      toggle.toggle();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('aborts the request on destroy and reports nothing afterwards', async () => {
      const { fetchMock } = stubPendingFetch();
      const toggle = createToggle();
      const listener = vi.fn();
      toggle.subscribe(listener);

      toggle.toggle();
      toggle.destroy();
      await vi.advanceTimersByTimeAsync(0);

      expect(sentRequest(fetchMock).signal?.aborted).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(shownSnackbars()).toStrictEqual([]);
    });

    it('ignores a response that arrives after destroy', async () => {
      const { respond } = stubPendingFetch();
      const toggle = createToggle();

      toggle.toggle();
      respond(jsonResponse({ data: makeFavoriteResult() }));
      toggle.destroy();
      await vi.advanceTimersByTimeAsync(0);

      expect(toggle.getState().status).toBe(pending);
      expect(shownSnackbars()).toStrictEqual([]);
    });

    it('sends nothing once destroyed', () => {
      const fetchMock = stubFetchJson({ data: makeFavoriteResult() });
      const toggle = createToggle();

      toggle.destroy();
      toggle.toggle();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(authDialog.getAuthDialogState().mode).toBeUndefined();
    });

    it('stops notifying after unsubscribe', () => {
      stubPendingFetch();
      const toggle = createToggle();
      const listener = vi.fn();
      const unsubscribe = toggle.subscribe(listener);

      unsubscribe();
      toggle.toggle();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
