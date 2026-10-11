// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER_EMAIL, makeGameDetails } from '../test-support/api-factories';
import { sentRequest, stubFetchJson, type FetchMock } from '../test-support/fetch-stub';
import { GAME_SLUG_LOAD_STATUS } from './use-game-slug-load';
import { LOAD_STATUS } from './use-load-state';
import type { GameDetailsController, GameDetailsState } from './use-game-details';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle } = GAME_SLUG_LOAD_STATUS;
const { loading, success, error: errorStatus } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const SLUG = 'cat-mail-co';
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };
const FALLBACK_MESSAGE = 'Game details are unavailable right now. Please try again.';

let hook: typeof import('./use-game-details');
let session: typeof import('../store/session-store');
let dialog: typeof import('../store/game-details-dialog-store');
let snackbars: typeof import('../store/snackbar-store');
const controllers: GameDetailsController[] = [];

function createDetails(): GameDetailsController {
  const controller = hook.useGameDetails();
  controllers.push(controller);
  return controller;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

async function waitForStatus(
  controller: GameDetailsController,
  status: GameDetailsState['status'],
): Promise<void> {
  await vi.waitFor(() => expect(controller.getState().status).toBe(status));
}

function requestedUrl(fetchMock: FetchMock, index = 0): URL {
  return sentRequest(fetchMock, index).url;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', '/library?category=puzzle');
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../store/session-store');
  dialog = await import('../store/game-details-dialog-store');
  snackbars = await import('../store/snackbar-store');
  hook = await import('./use-game-details');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useGameDetails', () => {
  it('is idle while no game is open', () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });

    expect(createDetails().getState()).toStrictEqual({ status: idle });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the game without userEmail for a guest', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });
    const details = createDetails();

    dialog.openGameDetailsDialog(SLUG);

    expect(details.getState()).toStrictEqual({ status: loading, slug: SLUG });
    await waitForStatus(details, success);
    const url = requestedUrl(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe(`${API_BASE_URL}/api/games/${SLUG}`);
    expect(url.search).toBe('');
  });

  it('requests the game with the URL-encoded session email while signed in', async () => {
    session.startSession(PROFILE);
    const fetchMock = stubFetchJson({ data: makeGameDetails({ isLikedByCurrentUser: true }) });
    const details = createDetails();

    dialog.openGameDetailsDialog(SLUG);
    await waitForStatus(details, success);

    expect(requestedUrl(fetchMock).search).toBe('?userEmail=student%40rs.school');
  });

  it('exposes the loaded game', async () => {
    const game = makeGameDetails({ isLikedByCurrentUser: true });
    stubFetchJson({ data: game });
    const details = createDetails();

    dialog.openGameDetailsDialog(SLUG);
    await waitForStatus(details, success);

    expect(details.getState()).toStrictEqual({ status: success, slug: SLUG, game });
  });

  it.each([
    { name: 'a 500', status: 500, error: 'Internal error', message: FALLBACK_MESSAGE },
    { name: 'a 400', status: 400, error: 'Invalid slug', message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      status: 429,
      error: 'Too many requests, please try again later.',
      message: 'Too many requests, please try again later.',
    },
  ])('shows an error banner state for $name', async ({ status, error, message }) => {
    stubFetchJson({ error }, status);
    const details = createDetails();

    dialog.openGameDetailsDialog(SLUG);
    await waitForStatus(details, errorStatus);

    expect(details.getState()).toStrictEqual({
      status: errorStatus,
      slug: SLUG,
      message,
      retry: expect.any(Function),
    });
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('retries the same request and confirms with a Snackbar', async () => {
    const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
    const details = createDetails();
    dialog.openGameDetailsDialog(SLUG);
    await waitForStatus(details, errorStatus);
    const state = details.getState();

    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ data: makeGameDetails() })));
    if (state.status === errorStatus) {
      state.retry();
    }
    await waitForStatus(details, success);

    expect(requestedUrl(fetchMock, 1).href).toBe(requestedUrl(fetchMock, 0).href);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'success', message: 'Game details loaded' },
    ]);
  });

  describe('unknown game (404)', () => {
    it('closes the dialog in place with one error Snackbar and no banner', async () => {
      stubFetchJson({ error: 'Game not found: no-such-game' }, 404);
      const details = createDetails();
      const listener = vi.fn();
      details.subscribe(listener);
      dialog.openGameDetailsDialog('no-such-game');
      const { length } = globalThis.history;

      await waitForStatus(details, idle);

      expect(globalThis.location.search).toBe('?category=puzzle');
      expect(globalThis.history.length).toBe(length);
      expect(dialog.getGameDetailsDialogState()).toStrictEqual({});
      expect(shownSnackbars()).toStrictEqual([
        { variant: 'error', message: 'This game could not be found.' },
      ]);
      expect(listener.mock.calls).toStrictEqual([
        [{ status: loading, slug: 'no-such-game' }],
        [{ status: idle }],
      ]);
    });

    it('shows the banner when the same game is reopened and then fails differently', async () => {
      const fetchMock = stubFetchJson({ error: 'Game not found: no-such-game' }, 404);
      const details = createDetails();
      dialog.openGameDetailsDialog('no-such-game');
      await waitForStatus(details, idle);
      const listener = vi.fn<(state: GameDetailsState) => void>();
      details.subscribe(listener);

      fetchMock.mockImplementation(() =>
        Promise.resolve(Response.json({ error: 'Internal error' }, { status: 500 })),
      );
      dialog.openGameDetailsDialog('no-such-game');
      await waitForStatus(details, errorStatus);

      expect(listener.mock.calls.map(([state]) => state.status)).toStrictEqual([
        loading,
        errorStatus,
      ]);
    });

    it('does not treat a later failure of a found game as missing', async () => {
      const fetchMock = stubFetchJson({ error: 'Game not found: no-such-game' }, 404);
      const details = createDetails();
      dialog.openGameDetailsDialog('no-such-game');
      await waitForStatus(details, idle);

      fetchMock.mockImplementation(() =>
        Promise.resolve(Response.json({ error: 'Internal error' }, { status: 500 })),
      );
      dialog.openGameDetailsDialog(SLUG);
      await waitForStatus(details, errorStatus);

      expect(details.getState()).toMatchObject({ slug: SLUG, message: FALLBACK_MESSAGE });
    });
  });

  it('refetches the open game with the email after login', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });
    const details = createDetails();
    dialog.openGameDetailsDialog(SLUG);
    await waitForStatus(details, success);

    session.startSession(PROFILE);
    await waitForStatus(details, success);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrl(fetchMock, 1).searchParams.get('userEmail')).toBe(TEST_USER_EMAIL);
  });

  it('aborts the pending request and stops loading on destroy', async () => {
    const fetchMock = stubFetchJson({ data: makeGameDetails() });
    const details = createDetails();
    dialog.openGameDetailsDialog(SLUG);

    details.destroy();
    dialog.openGameDetailsDialog('other-game');
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentRequest(fetchMock, 0).signal?.aborted).toBe(true);
  });

  it('stops notifying after unsubscribe and destroy', async () => {
    stubFetchJson({ data: makeGameDetails() });
    const details = createDetails();
    const listener = vi.fn();
    const unsubscribe = details.subscribe(listener);

    unsubscribe();
    dialog.openGameDetailsDialog(SLUG);
    details.destroy();
    dialog.closeGameDetailsDialog();
    await vi.advanceTimersByTimeAsync(0);

    expect(listener).not.toHaveBeenCalled();
    expect(details.getState()).toStrictEqual({ status: loading, slug: SLUG });
  });
});
