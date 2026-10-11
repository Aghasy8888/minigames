// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER_EMAIL, makeComment, makeCommentsMeta } from '../test-support/api-factories';
import { sentRequest, stubFetchJson } from '../test-support/fetch-stub';
import type { GameCommentsController } from './use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from './use-game-slug-load';
import { LOAD_STATUS } from './use-load-state';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { active } = GAME_SLUG_LOAD_STATUS;
const { success, empty } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const SLUG = 'cat-mail-co';

let hook: typeof import('./use-game-comments');
let session: typeof import('../store/session-store');
let dialog: typeof import('../store/game-details-dialog-store');
const controllers: GameCommentsController[] = [];

function createComments(): GameCommentsController {
  const controller = hook.useGameComments();
  controllers.push(controller);
  return controller;
}

async function waitForLoad(controller: GameCommentsController, status: string): Promise<void> {
  await vi.waitFor(() => {
    const state = controller.getState();
    expect(state.status === active ? state.load.status : state.status).toBe(status);
  });
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', '/library');
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../store/session-store');
  dialog = await import('../store/game-details-dialog-store');
  hook = await import('./use-game-comments');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useGameComments', () => {
  it('requests the 3 newest comments without userEmail for a guest', async () => {
    const fetchMock = stubFetchJson({ data: [makeComment()], meta: makeCommentsMeta() });
    const comments = createComments();

    dialog.openGameDetailsDialog(SLUG);
    await waitForLoad(comments, success);

    expect(sentRequest(fetchMock).url.href).toBe(
      `${API_BASE_URL}/api/games/${SLUG}/comments?limit=3&sort=newest`,
    );
  });

  it('adds the URL-encoded session email while signed in', async () => {
    session.startSession({ email: TEST_USER_EMAIL, displayName: 'Student' });
    const fetchMock = stubFetchJson({ data: [makeComment()], meta: makeCommentsMeta() });
    const comments = createComments();

    dialog.openGameDetailsDialog(SLUG);
    await waitForLoad(comments, success);

    expect(sentRequest(fetchMock).url.search).toBe(
      '?limit=3&sort=newest&userEmail=student%40rs.school',
    );
  });

  it('exposes the comments with the total count from meta', async () => {
    const meta = makeCommentsMeta({ totalComments: 12, returnedCount: 1 });
    stubFetchJson({ data: [makeComment({ isLikedByCurrentUser: true })], meta });
    const comments = createComments();

    dialog.openGameDetailsDialog(SLUG);
    await waitForLoad(comments, success);

    expect(comments.getState()).toMatchObject({
      status: active,
      slug: SLUG,
      load: { status: success, data: [makeComment({ isLikedByCurrentUser: true })], meta },
    });
  });

  it('reports a game with no comments as empty', async () => {
    const meta = makeCommentsMeta({ totalComments: 0, returnedCount: 0 });
    stubFetchJson({ data: [], meta });
    const comments = createComments();

    dialog.openGameDetailsDialog(SLUG);
    await waitForLoad(comments, empty);

    expect(comments.getState()).toMatchObject({ load: { status: empty, meta } });
  });
});
