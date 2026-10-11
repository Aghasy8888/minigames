// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { TEST_USER_EMAIL, makeComment, makeCommentsMeta } from '../test-support/api-factories';
import { expireStoredSession } from '../test-support/app-session';
import {
  jsonResponse,
  sentRequest,
  stubFetch,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import { AUTH_DIALOG_MODE } from '../utils/auth-dialog-query';
import type { GameCommentsController, GameCommentsState } from './use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from './use-game-slug-load';
import { LOAD_STATUS } from './use-load-state';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle, active } = GAME_SLUG_LOAD_STATUS;
const { success } = LOAD_STATUS;
const { login } = AUTH_DIALOG_MODE;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const SLUG = 'cat-mail-co';
const GAME_URL = `/library?game=${SLUG}`;
const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;
const COMMENT_POST_TIMEOUT_MS = 15_000;
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'Student' };
const DRAFT = 'my unsent draft';

const GUEST_SNACKBAR = { variant: 'warning', message: 'Log in to post a comment.' };
const EXPIRY_SNACKBAR = {
  variant: 'info',
  message: 'Your session has ended. Please log in again.',
};
const POSTED_SNACKBAR = { variant: 'success', message: 'Comment posted' };
const REJECTED_MESSAGE = "Your comment couldn't be posted. Please try again.";
const UNKNOWN_OUTCOME_SNACKBAR = {
  variant: 'warning',
  message:
    "We couldn't confirm whether your comment was posted. Check the latest comments before sending it again.",
};

type FakeComments = GameCommentsController & { reload: Mock<() => void> };

let hook: typeof import('./use-comment-submit');
let session: typeof import('../store/session-store');
let snackbars: typeof import('../store/snackbar-store');
let authDialog: typeof import('../store/auth-dialog-store');
let drafts: typeof import('../store/comment-draft-store');

function noop(): void {}

function activeCommentsState(): GameCommentsState {
  return {
    status: active,
    slug: SLUG,
    reload: noop,
    load: { status: success, data: [makeComment()], meta: makeCommentsMeta() },
  };
}

function makeComments(state: GameCommentsState = activeCommentsState()): FakeComments {
  return {
    getState: () => state,
    subscribe: () => noop,
    reload: vi.fn<() => void>(),
    destroy: noop,
  };
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function currentUrl(): string {
  const { pathname, search } = globalThis.location;
  return `${pathname}${search}`;
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
  drafts = await import('../store/comment-draft-store');
  hook = await import('./use-comment-submit');
  drafts.setCommentDraft(DRAFT);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useCommentSubmit', () => {
  describe('rejected before any request', () => {
    beforeEach(() => {
      session.startSession(PROFILE);
    });

    it.each([
      { name: 'empty text', text: '' },
      { name: 'whitespace-only text', text: ' \n\t ' },
      { name: 'text over 500 characters', text: 'a'.repeat(501) },
      { name: 'text over 500 characters after trimming', text: ` ${'a'.repeat(501)} ` },
    ])('refuses $name without sending', async ({ text }) => {
      const fetchMock = stubFetchJson({ data: makeComment() });
      const comments = makeComments();

      await expect(hook.useCommentSubmit(comments).submit(text)).resolves.toBe(false);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(shownSnackbars()).toStrictEqual([]);
      expect(drafts.getCommentDraft()).toBe(DRAFT);
    });

    it('refuses when no game is open', async () => {
      const fetchMock = stubFetchJson({ data: makeComment() });
      const comments = makeComments({ status: idle });

      await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(false);

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('without an active session', () => {
    it('sends nothing for a guest, opens Auth over the game, and warns once', async () => {
      const fetchMock = stubFetchJson({ data: makeComment() });
      const comments = makeComments();

      await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(false);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(authDialog.getAuthDialogState().mode).toBe(login);
      expect(shownSnackbars()).toStrictEqual([GUEST_SNACKBAR]);
      expect(drafts.getCommentDraft()).toBe(DRAFT);
    });

    it('sends nothing for a session that expired while typing, with only the expiry Snackbar', async () => {
      const fetchMock = stubFetchJson({ data: makeComment() });
      session.startSession(PROFILE);
      const comments = makeComments();
      vi.setSystemTime(NOW + TTL_MS);

      await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(false);
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
      expect(drafts.getCommentDraft()).toBe(DRAFT);
    });

    it('sends nothing once the stored session is edited to an expired time, without a reload', async () => {
      const fetchMock = stubFetchJson({ data: makeComment() });
      session.startSession(PROFILE);
      const comments = makeComments();

      expireStoredSession();
      await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(false);
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(currentUrl()).toBe(`${GAME_URL}&auth=login`);
      expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
      expect(drafts.getCommentDraft()).toBe(DRAFT);
    });
  });

  describe('with an active session', () => {
    it('posts the trimmed text with the session email and author name', async () => {
      session.startSession(PROFILE);
      const fetchMock = stubFetchJson({ data: makeComment() }, 201);

      await hook.useCommentSubmit(makeComments()).submit('  Great game!  ');

      const { url, method, contentType, body } = sentRequest(fetchMock);
      expect(url.href).toBe(`${API_BASE_URL}/api/games/${SLUG}/comments`);
      expect(method).toBe('POST');
      expect(contentType).toBe('application/json');
      expect(body).toStrictEqual({
        userEmail: TEST_USER_EMAIL,
        authorName: 'Student',
        text: 'Great game!',
      });
    });

    it('sends text of exactly 500 characters', async () => {
      session.startSession(PROFILE);
      const fetchMock = stubFetchJson({ data: makeComment() }, 201);
      const text = 'a'.repeat(500);

      await expect(hook.useCommentSubmit(makeComments()).submit(text)).resolves.toBe(true);

      expect(sentRequest(fetchMock).body).toMatchObject({ text });
    });

    it('falls back to the email local part when the display name is too short', async () => {
      session.startSession({ email: TEST_USER_EMAIL, displayName: 'S' });
      const fetchMock = stubFetchJson({ data: makeComment() }, 201);

      await hook.useCommentSubmit(makeComments()).submit('Great game!');

      expect(sentRequest(fetchMock).body).toMatchObject({ authorName: 'student' });
    });

    it('on 201 clears the draft, confirms once, and reloads the comments', async () => {
      session.startSession(PROFILE);
      stubFetchJson({ data: makeComment() }, 201);
      const comments = makeComments();

      await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(true);

      expect(drafts.getCommentDraft()).toBe('');
      expect(shownSnackbars()).toStrictEqual([POSTED_SNACKBAR]);
      expect(comments.reload).toHaveBeenCalledTimes(1);
    });

    it('locks while the request is pending and unlocks once it settles', async () => {
      session.startSession(PROFILE);
      const { fetchMock, respond } = stubPendingFetch();
      const submitter = hook.useCommentSubmit(makeComments());

      const first = submitter.submit('First');
      await expect(submitter.submit('Second')).resolves.toBe(false);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      respond(jsonResponse({ data: makeComment() }, 201));
      await expect(first).resolves.toBe(true);

      const third = submitter.submit('Third');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      respond(jsonResponse({ data: makeComment() }, 201));
      await third;
    });

    it.each([
      { name: '400', status: 400, error: 'text is required', message: REJECTED_MESSAGE },
      { name: '401', status: 401, error: 'userEmail is required', message: REJECTED_MESSAGE },
      { name: '404', status: 404, error: 'Game not found: cat-mail-co', message: REJECTED_MESSAGE },
      {
        name: '429',
        status: 429,
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
      },
    ])(
      'on a definitive $name keeps the draft, shows one error, and allows a retry',
      async ({ status, error, message }) => {
        session.startSession(PROFILE);
        const fetchMock = stubFetchJson({ error }, status);
        const comments = makeComments();
        const submitter = hook.useCommentSubmit(comments);

        await expect(submitter.submit('Great game!')).resolves.toBe(false);
        await vi.advanceTimersByTimeAsync(60_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(drafts.getCommentDraft()).toBe(DRAFT);
        expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message }]);
        expect(comments.reload).not.toHaveBeenCalled();

        await submitter.submit('Great game!');

        expect(fetchMock).toHaveBeenCalledTimes(2);
      },
    );

    it.each([
      {
        name: 'a network failure',
        stub: () => stubFetch(() => Promise.reject(new TypeError('Failed to fetch'))),
      },
      { name: 'a 500 response', stub: () => stubFetchJson({ error: 'Internal error' }, 500) },
    ])(
      'on $name keeps the draft, warns that the outcome is unknown, and never resends',
      async ({ stub }) => {
        session.startSession(PROFILE);
        const fetchMock = stub();
        const comments = makeComments();

        await expect(hook.useCommentSubmit(comments).submit('Great game!')).resolves.toBe(false);
        await vi.advanceTimersByTimeAsync(60_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(drafts.getCommentDraft()).toBe(DRAFT);
        expect(shownSnackbars()).toStrictEqual([UNKNOWN_OUTCOME_SNACKBAR]);
        expect(comments.reload).toHaveBeenCalledTimes(1);
      },
    );

    it('treats a request that times out as an unknown outcome and never resends', async () => {
      session.startSession(PROFILE);
      const timeout = new AbortController();
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
      const { fetchMock } = stubPendingFetch();
      const comments = makeComments();

      const submitted = hook.useCommentSubmit(comments).submit('Great game!');
      timeout.abort(new DOMException('The operation timed out.', 'TimeoutError'));

      await expect(submitted).resolves.toBe(false);
      expect(timeoutSpy).toHaveBeenCalledExactlyOnceWith(COMMENT_POST_TIMEOUT_MS);
      expect(sentRequest(fetchMock).signal).toBe(timeout.signal);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(drafts.getCommentDraft()).toBe(DRAFT);
      expect(shownSnackbars()).toStrictEqual([UNKNOWN_OUTCOME_SNACKBAR]);
      expect(comments.reload).toHaveBeenCalledTimes(1);
    });
  });
});
