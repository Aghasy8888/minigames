// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_USER_EMAIL, makeCommentLikeResult } from '../test-support/api-factories';
import { expireStoredSession } from '../test-support/app-session';
import {
  jsonResponse,
  sentRequest,
  stubFetch,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import { AUTH_DIALOG_MODE } from '../utils/auth-dialog-query';
import {
  COMMENT_LIKE_STATUS,
  type CommentLikeController,
  type UseCommentLikeOptions,
} from './use-comment-like';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle, pending } = COMMENT_LIKE_STATUS;
const { login } = AUTH_DIALOG_MODE;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const COMMENT_ID = 'comment 1/a';
const GAME_URL = '/library?game=cat-mail-co';
const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };

const GUEST_SNACKBAR = { variant: 'warning', message: 'Log in to like comments.' };
const EXPIRY_SNACKBAR = {
  variant: 'info',
  message: 'Your session has ended. Please log in again.',
};
const FALLBACK_ERROR_MESSAGE = 'Comment likes could not be updated right now. Please try again.';
const UNCONFIRMED_MESSAGE =
  "Couldn't reach the server, so your like wasn't confirmed. Check your connection and reopen the game before trying again.";

let hook: typeof import('./use-comment-like');
let session: typeof import('../store/session-store');
let snackbars: typeof import('../store/snackbar-store');
let authDialog: typeof import('../store/auth-dialog-store');
const controllers: CommentLikeController[] = [];

function createLike(overrides: Partial<UseCommentLikeOptions> = {}): CommentLikeController {
  const controller = hook.useCommentLike({
    commentId: COMMENT_ID,
    isLiked: false,
    likesCount: 3,
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
  hook = await import('./use-comment-like');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useCommentLike', () => {
  it('starts idle from the personalized comments response', () => {
    expect(createLike({ isLiked: true, likesCount: 8 }).getState()).toStrictEqual({
      status: idle,
      isLiked: true,
      likesCount: 8,
    });
  });

  describe('without an active session', () => {
    it('sends nothing for a guest, opens Auth over the game, and warns once', () => {
      const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
      const like = createLike();
      const listener = vi.fn();
      like.subscribe(listener);

      like.toggle();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(listener).not.toHaveBeenCalled();
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(authDialog.getAuthDialogState().mode).toBe(login);
      expect(shownSnackbars()).toStrictEqual([GUEST_SNACKBAR]);
    });

    it('sends nothing for an expired session and shows only the expiry Snackbar', async () => {
      const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
      session.startSession(PROFILE);
      const like = createLike();
      vi.setSystemTime(NOW + TTL_MS);

      like.toggle();
      await waitForSnackbar();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(like.getState()).toStrictEqual({ status: idle, isLiked: false, likesCount: 3 });
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
    });

    it('sends nothing once the stored session is edited to an expired time, without a reload', async () => {
      const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
      session.startSession(PROFILE);
      const like = createLike();

      expireStoredSession();
      like.toggle();
      await waitForSnackbar();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(like.getState()).toStrictEqual({ status: idle, isLiked: false, likesCount: 3 });
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
    });
  });

  describe('with an active session', () => {
    beforeEach(() => {
      session.startSession(PROFILE);
    });

    it('posts the session email to the encoded comment-like endpoint', async () => {
      const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
      const like = createLike();

      like.toggle();
      await vi.waitFor(() => expect(like.getState().status).toBe(idle));

      const { url, method, contentType, body } = sentRequest(fetchMock);
      expect(url.href).toBe(`${API_BASE_URL}/api/comments/comment%201%2Fa/like`);
      expect(method).toBe('POST');
      expect(contentType).toBe('application/json');
      expect(body).toStrictEqual({ userEmail: TEST_USER_EMAIL });
    });

    it.each([
      {
        name: 'likes the comment',
        isLiked: false,
        result: { isLikedByCurrentUser: true, likesCount: 4 },
        expected: { isLiked: true, likesCount: 4 },
        message: 'Comment liked',
      },
      {
        name: 'removes the like',
        isLiked: true,
        result: { isLikedByCurrentUser: false, likesCount: 2 },
        expected: { isLiked: false, likesCount: 2 },
        message: 'Like removed',
      },
    ])('$name using only the server response', async ({ isLiked, result, expected, message }) => {
      stubFetchJson({ data: makeCommentLikeResult(result) });
      const like = createLike({ isLiked, likesCount: 3 });

      like.toggle();
      await vi.waitFor(() => expect(like.getState().status).toBe(idle));

      expect(like.getState()).toStrictEqual({ status: idle, ...expected });
      expect(shownSnackbars()).toStrictEqual([{ variant: 'success', message }]);
    });

    it('trusts the server even when it does not confirm a flip', async () => {
      stubFetchJson({
        data: makeCommentLikeResult({ isLikedByCurrentUser: false, likesCount: 6 }),
      });
      const like = createLike({ isLiked: false, likesCount: 3 });

      like.toggle();
      await vi.waitFor(() => expect(like.getState().status).toBe(idle));

      expect(like.getState()).toStrictEqual({ status: idle, isLiked: false, likesCount: 6 });
    });

    it('locks while pending: state is unchanged and a second toggle sends nothing', async () => {
      const { fetchMock, respond } = stubPendingFetch();
      const like = createLike();
      const listener = vi.fn();
      like.subscribe(listener);

      like.toggle();
      like.toggle();

      expect(like.getState()).toStrictEqual({ status: pending, isLiked: false, likesCount: 3 });
      expect(listener).toHaveBeenCalledExactlyOnceWith({
        status: pending,
        isLiked: false,
        likesCount: 3,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      respond(
        jsonResponse({
          data: makeCommentLikeResult({ isLikedByCurrentUser: true, likesCount: 4 }),
        }),
      );
      await vi.waitFor(() => expect(like.getState().status).toBe(idle));

      expect(listener).toHaveBeenLastCalledWith({ status: idle, isLiked: true, likesCount: 4 });
    });

    it.each([
      { name: '401', status: 401, error: 'userEmail is required', message: FALLBACK_ERROR_MESSAGE },
      {
        name: '404',
        status: 404,
        error: 'Comment not found: comment 1/a',
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
        const like = createLike();

        like.toggle();
        await waitForSnackbar();
        await vi.advanceTimersByTimeAsync(60_000);

        expect(like.getState()).toStrictEqual({ status: idle, isLiked: false, likesCount: 3 });
        expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message }]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      },
    );

    it('reports a network failure as not confirmed, without replaying', async () => {
      const fetchMock = stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
      const like = createLike();

      like.toggle();
      await waitForSnackbar();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(like.getState()).toStrictEqual({ status: idle, isLiked: false, likesCount: 3 });
      expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message: UNCONFIRMED_MESSAGE }]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('unlocks after a failure so the user can try again explicitly', async () => {
      const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
      const like = createLike();

      like.toggle();
      await waitForSnackbar();
      like.toggle();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('aborts the request on destroy and reports nothing afterwards', async () => {
      const { fetchMock } = stubPendingFetch();
      const like = createLike();
      const listener = vi.fn();
      like.subscribe(listener);

      like.toggle();
      like.destroy();
      await vi.advanceTimersByTimeAsync(0);

      expect(sentRequest(fetchMock).signal?.aborted).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(shownSnackbars()).toStrictEqual([]);
    });

    it('ignores a response that arrives after destroy', async () => {
      const { respond } = stubPendingFetch();
      const like = createLike();

      like.toggle();
      respond(jsonResponse({ data: makeCommentLikeResult() }));
      like.destroy();
      await vi.advanceTimersByTimeAsync(0);

      expect(like.getState().status).toBe(pending);
      expect(shownSnackbars()).toStrictEqual([]);
    });

    it('sends nothing once destroyed', () => {
      const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
      const like = createLike();

      like.destroy();
      like.toggle();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(authDialog.getAuthDialogState().mode).toBeUndefined();
    });

    it('stops notifying after unsubscribe', () => {
      stubPendingFetch();
      const like = createLike();
      const listener = vi.fn();
      const unsubscribe = like.subscribe(listener);

      unsubscribe();
      like.toggle();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
