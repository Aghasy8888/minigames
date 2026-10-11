// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { TEST_USER_EMAIL } from '../test-support/api-factories';
import { deferred, type Deferred } from '../test-support/deferred';
import {
  GAME_SLUG_LOAD_STATUS,
  type GameSlugLoadContext,
  type GameSlugLoadController,
} from './use-game-slug-load';
import { LOAD_STATUS, type LoadResult } from './use-load-state';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle, active } = GAME_SLUG_LOAD_STATUS;
const { loading, success } = LOAD_STATUS;

type LoadFunction = (slug: string, context: GameSlugLoadContext) => Promise<LoadResult<string>>;

const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };

let hook: typeof import('./use-game-slug-load');
let session: typeof import('../store/session-store');
let dialog: typeof import('../store/game-details-dialog-store');
let load: Mock<LoadFunction>;
let results: Deferred<LoadResult<string>>[];
const controllers: GameSlugLoadController<string>[] = [];

function createSlugLoad(): GameSlugLoadController<string> {
  const controller = hook.useGameSlugLoad<string>({
    load,
    fallbackErrorMessage: 'Game details are unavailable right now. Please try again.',
    retrySuccessMessage: 'Game details loaded',
  });
  controllers.push(controller);
  return controller;
}

function requestAt(index: number): { slug?: string; userEmail?: string; signal?: AbortSignal } {
  const [slug, context] = load.mock.calls[index] ?? [];
  return { slug, userEmail: context?.userEmail, signal: context?.signal };
}

beforeEach(async () => {
  vi.useFakeTimers();
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', '/library');
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../store/session-store');
  dialog = await import('../store/game-details-dialog-store');
  hook = await import('./use-game-slug-load');
  results = [];
  load = vi.fn<LoadFunction>(() => {
    const result = deferred<LoadResult<string>>();
    results.push(result);
    return result.promise;
  });
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useGameSlugLoad', () => {
  it('stays idle and loads nothing while the dialog is closed', () => {
    const slugLoad = createSlugLoad();

    expect(slugLoad.getState()).toStrictEqual({ status: idle });
    expect(load).not.toHaveBeenCalled();
  });

  it('loads the slug from a deep link right away', () => {
    globalThis.history.replaceState(undefined, '', '/library?game=snake');
    dialog.syncGameDetailsFromLocation();

    const slugLoad = createSlugLoad();

    expect(slugLoad.getState()).toMatchObject({
      status: active,
      slug: 'snake',
      load: { status: loading },
    });
    expect(requestAt(0)).toMatchObject({ slug: 'snake', userEmail: undefined });
  });

  it('loads when the dialog opens and exposes the result', async () => {
    const slugLoad = createSlugLoad();

    dialog.openGameDetailsDialog('snake');
    results[0]?.resolve({ items: ['Snake'] });
    await vi.advanceTimersByTimeAsync(0);

    expect(slugLoad.getState()).toMatchObject({
      status: active,
      slug: 'snake',
      load: { status: success, data: ['Snake'] },
    });
  });

  it('aborts the old request and loads the new slug when the game changes', () => {
    createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    dialog.openGameDetailsDialog('tetris');

    expect(requestAt(0).signal?.aborted).toBe(true);
    expect(requestAt(1)).toMatchObject({ slug: 'tetris' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('goes idle and aborts the request when the dialog closes', () => {
    const slugLoad = createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    dialog.closeGameDetailsDialog();

    expect(slugLoad.getState()).toStrictEqual({ status: idle });
    expect(requestAt(0).signal?.aborted).toBe(true);
  });

  it('sends the session email only while a session is active', () => {
    session.startSession(PROFILE);
    createSlugLoad();

    dialog.openGameDetailsDialog('snake');

    expect(requestAt(0).userEmail).toBe(TEST_USER_EMAIL);
  });

  it('refetches with the email when the user logs in while the dialog is open', () => {
    createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    session.startSession(PROFILE);

    expect(requestAt(0).signal?.aborted).toBe(true);
    expect(requestAt(1)).toMatchObject({ slug: 'snake', userEmail: TEST_USER_EMAIL });
  });

  it('refetches as a guest when the user logs out while the dialog is open', async () => {
    session.startSession(PROFILE);
    createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    await session.endSession({ reason: 'logout' });

    expect(requestAt(0).signal?.aborted).toBe(true);
    expect(requestAt(1)).toMatchObject({ slug: 'snake', userEmail: undefined });
  });

  it('does not refetch when the session email stays the same', () => {
    session.startSession(PROFILE);
    createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    session.startSession(PROFILE);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('only remembers a login while the dialog is closed, then uses it on open', () => {
    createSlugLoad();

    session.startSession(PROFILE);

    expect(load).not.toHaveBeenCalled();

    dialog.openGameDetailsDialog('snake');

    expect(requestAt(0).userEmail).toBe(TEST_USER_EMAIL);
  });

  it.each([
    {
      name: 'the controller',
      reload: (controller: GameSlugLoadController<string>) => controller.reload(),
    },
    {
      name: 'the active state',
      reload: (controller: GameSlugLoadController<string>) => {
        const state = controller.getState();
        if (state.status === active) {
          state.reload();
        }
      },
    },
  ])('reloads the open slug through $name', ({ reload }) => {
    const slugLoad = createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    reload(slugLoad);

    expect(requestAt(1)).toMatchObject({ slug: 'snake' });
    expect(requestAt(0).signal?.aborted).toBe(true);
  });

  it('ignores reload while idle', () => {
    const slugLoad = createSlugLoad();

    slugLoad.reload();

    expect(load).not.toHaveBeenCalled();
  });

  it('notifies subscribers until unsubscribed', () => {
    const slugLoad = createSlugLoad();
    const listener = vi.fn();
    const unsubscribe = slugLoad.subscribe(listener);

    dialog.openGameDetailsDialog('snake');
    unsubscribe();
    dialog.closeGameDetailsDialog();

    expect(listener).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ status: active, slug: 'snake' }),
    );
  });

  it('stops following the dialog and session after destroy', () => {
    const slugLoad = createSlugLoad();
    dialog.openGameDetailsDialog('snake');

    slugLoad.destroy();
    dialog.openGameDetailsDialog('tetris');
    session.startSession(PROFILE);

    expect(requestAt(0).signal?.aborted).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
