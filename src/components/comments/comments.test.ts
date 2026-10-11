// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { GameCommentsController, GameCommentsState } from '../../hooks/use-game-comments';
import { GAME_SLUG_LOAD_STATUS } from '../../hooks/use-game-slug-load';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import type { GameComment } from '../../services/games-api-provider';
import {
  TEST_USER_EMAIL,
  makeComment,
  makeCommentLikeResult,
  makeCommentsMeta,
} from '../../test-support/api-factories';
import { deferred } from '../../test-support/deferred';
import { jsonResponse, sentRequest, stubFetch, stubFetchJson } from '../../test-support/fetch-stub';
import { currentUrl } from '../../test-support/history';

vi.mock('../../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { idle, active } = GAME_SLUG_LOAD_STATUS;
const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

type CommentsModule = typeof import('.');
type SessionStore = typeof import('../../store/session-store');
type SnackbarStore = typeof import('../../store/snackbar-store');
type DraftStore = typeof import('../../store/comment-draft-store');
type CommentsLoad = Exclude<GameCommentsState, { status: typeof idle }>['load'];

type FakeComments = GameCommentsController & {
  reload: Mock<() => void>;
  emit: (state: GameCommentsState) => void;
};

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const SLUG = 'cat-mail-co';
const START_URL = `/library?game=${SLUG}`;
const NOW = new Date('2026-10-11T12:00:00.000Z');
const PROFILE = { email: TEST_USER_EMAIL, displayName: 'student' };
const AVATAR_CLASS = /^comments__avatar comments__avatar--random-[1-5]$/;

let comments: CommentsModule;
let session: SessionStore;
let snackbars: SnackbarStore;
let drafts: DraftStore;
let section: HTMLElement;

function noop(): void {}

/** Stands in for `useGameComments`; only the rendered output and the reload call are checked. */
function fakeComments(initial: GameCommentsState): FakeComments {
  let state = initial;
  const listeners = new Set<(next: GameCommentsState) => void>();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reload: vi.fn<() => void>(),
    destroy: noop,
    emit(next) {
      state = next;
      for (const listener of listeners) {
        listener(next);
      }
    },
  };
}

function activeState(load: CommentsLoad): GameCommentsState {
  return { status: active, slug: SLUG, reload: noop, load };
}

function loaded(data: GameComment[], totalComments = data.length): GameCommentsState {
  return activeState({
    status: success,
    data,
    meta: makeCommentsMeta({ totalComments, returnedCount: data.length }),
  });
}

function mount(controller: FakeComments): HTMLElement {
  section = comments.createComments({ controller });
  document.body.append(section);
  return section;
}

function query<T extends Element>(selector: string): T {
  const element = section.querySelector<T>(selector);
  if (!element) {
    throw new Error(`missing element: ${selector}`);
  }
  return element;
}

function titleText(): string | null {
  return query('.comments__title').textContent;
}

function content(): HTMLElement {
  return query<HTMLElement>('.comments__content');
}

function cards(): HTMLElement[] {
  return [...section.querySelectorAll<HTMLElement>('.comments__item')];
}

function avatarClasses(): (string | undefined)[] {
  return cards().map((card) => card.querySelector('.comments__avatar')?.className);
}

function likeButtons(): HTMLButtonElement[] {
  return [...section.querySelectorAll<HTMLButtonElement>('.comment-like-button')];
}

function textarea(): HTMLTextAreaElement {
  return query<HTMLTextAreaElement>('.comment-composer__textarea');
}

function typeComment(text: string): void {
  textarea().value = text;
  textarea().dispatchEvent(new Event('input'));
}

function pressEnter(): void {
  textarea().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

/** Lets awaited (stubbed) requests and the follow-up steps run. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv('VITE_API_MOCK', '');
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', START_URL);
  vi.resetModules();
  const firebase = await import('../../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('../../store/session-store');
  snackbars = await import('../../store/snackbar-store');
  drafts = await import('../../store/comment-draft-store');
  comments = await import('.');
});

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  localStorage.clear();
});

describe('layout', () => {
  it('is a section labelled by its title, with the composer above the content area', () => {
    mount(fakeComments({ status: idle }));
    const title = query('h3');

    expect(section.getAttribute('aria-labelledby')).toBe(title.id);
    expect([...section.children].map(({ className }) => className)).toStrictEqual([
      'comments__title',
      'comment-composer',
      'comments__content',
    ]);
  });

  it('renders nothing in the content area while no game is open', () => {
    mount(fakeComments({ status: idle }));

    expect(titleText()).toBe('Comments');
    expect(content().children).toHaveLength(0);
  });
});

describe('content states', () => {
  it('shows a busy three-card skeleton while loading', () => {
    mount(fakeComments(activeState({ status: loading })));
    const skeleton = query('.comments__content > .comments__list');

    expect(content().getAttribute('aria-busy')).toBe('true');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.querySelectorAll('.comments__card')).toHaveLength(3);
    expect(titleText()).toBe('Comments');
  });

  it('gives each skeleton card the avatar, name, time, two text lines, and like of a real card', () => {
    mount(fakeComments(activeState({ status: loading })));
    const card = query('.comments__content .comments__card');

    expect(
      [...card.querySelectorAll('.skeleton')].map(({ className }) =>
        className.replace(/^.*comments__skeleton--/, ''),
      ),
    ).toStrictEqual(['avatar', 'name', 'time', 'line', 'line', 'like']);
  });

  it('lists the comments in the order the API returned them', () => {
    mount(
      fakeComments(
        loaded([
          makeComment({ commentId: 'c-1', authorName: 'Newest' }),
          makeComment({ commentId: 'c-2', authorName: 'Older' }),
        ]),
      ),
    );

    expect(
      cards().map((card) => card.querySelector('.comments__author-name')?.textContent),
    ).toEqual(['Newest', 'Older']);
    expect(content().getAttribute('aria-busy')).toBe('false');
  });

  it('counts all comments from meta.totalComments, not just the returned page', () => {
    mount(fakeComments(loaded([makeComment()], 12)));

    expect(titleText()).toBe('Comments (12)');
  });

  it('counts the returned comments when the response has no meta', () => {
    mount(
      fakeComments(
        activeState({
          status: success,
          data: [makeComment({ commentId: 'a' }), makeComment({ commentId: 'b' })],
        }),
      ),
    );

    expect(titleText()).toBe('Comments (2)');
  });

  it('shows a neutral empty state with a zero count when there are no comments', () => {
    mount(fakeComments(activeState({ status: empty })));
    const emptyState = query('.empty-state');

    expect(titleText()).toBe('Comments (0)');
    expect(emptyState.getAttribute('role')).toBe('status');
    expect(emptyState.querySelector('.empty-state__title')?.textContent).toBe('No comments yet');
    expect(section.querySelector('.error-banner')).toBeNull();
  });

  it('shows an error banner whose Retry reloads the comments', () => {
    const retry = vi.fn<() => void>();
    mount(
      fakeComments(
        activeState({ status: errorStatus, message: 'Comments are unavailable.', retry }),
      ),
    );
    const banner = query('.error-banner');

    banner.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();

    expect(titleText()).toBe('Comments');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.querySelector('.error-banner__title')?.textContent).toBe(
      'Could not load comments',
    );
    expect(banner.querySelector('.error-banner__message')?.textContent).toBe(
      'Comments are unavailable.',
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps the last comments on screen when the game closes, so the fade-out has content', () => {
    const controller = fakeComments(loaded([makeComment()]));
    mount(controller);

    controller.emit({ status: idle });

    expect(cards()).toHaveLength(1);
    expect(titleText()).toBe('Comments (1)');
  });

  it('swaps only the content area and keeps the composer mounted', () => {
    const controller = fakeComments(activeState({ status: loading }));
    mount(controller);
    const composer = query('.comment-composer');

    controller.emit(loaded([makeComment()]));

    expect(query('.comment-composer')).toBe(composer);
    expect(cards()).toHaveLength(1);
    expect(section.querySelector('.skeleton')).toBeNull();
  });
});

describe('comment card', () => {
  it('shows the author with an initial avatar, the relative time, and the text', () => {
    mount(
      fakeComments(
        loaded([
          makeComment({
            authorName: 'forestDweller',
            createdAt: '2026-10-11T11:55:00.000Z',
            text: 'Lovely game!',
          }),
        ]),
      ),
    );
    const [card] = cards();
    const avatar = card?.querySelector('.comments__avatar');
    const time = card?.querySelector('time');

    expect(avatar?.textContent).toBe('F');
    expect(avatar?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.className).toMatch(AVATAR_CLASS);
    expect(card?.querySelector('.comments__author-name')?.textContent).toBe('forestDweller');
    expect(time?.dateTime).toBe('2026-10-11T11:55:00.000Z');
    expect(time?.textContent).toBe('5 min ago');
    expect(card?.querySelector('.comments__text')?.textContent).toBe('Lovely game!');
  });

  it('renders comment text and author names as text, never as markup', () => {
    mount(fakeComments(loaded([makeComment({ authorName: '<i>x</i>', text: '<b>x</b>' })])));
    const [card] = cards();

    expect(card?.querySelector('b, i')).toBeNull();
    expect(card?.querySelector('.comments__text')?.textContent).toBe('<b>x</b>');
  });

  it('labels the like button with the author and starts it from the per-user flag', () => {
    mount(
      fakeComments(
        loaded([
          makeComment({ commentId: 'c-1', authorName: 'Jane', isLikedByCurrentUser: true }),
          makeComment({ commentId: 'c-2', authorName: 'Joe', likesCount: 7 }),
        ]),
      ),
    );
    const [liked, notLiked] = likeButtons();

    expect(liked?.getAttribute('aria-label')).toBe('Like comment by Jane');
    expect(liked?.getAttribute('aria-pressed')).toBe('true');
    expect(notLiked?.getAttribute('aria-pressed')).toBe('false');
    expect(notLiked?.querySelector('.comment-like-button__count')?.textContent).toBe('7');
  });

  it('keeps each commenter avatar color across re-renders', () => {
    const data = [
      makeComment({ commentId: 'c-1' }),
      makeComment({ commentId: 'c-2' }),
      makeComment({ commentId: 'c-3' }),
    ];
    const controller = fakeComments(loaded(data));
    mount(controller);
    const before = avatarClasses();

    controller.emit(activeState({ status: loading }));
    controller.emit(loaded(data));

    expect(avatarClasses()).toStrictEqual(before);
  });
});

describe('comment likes', () => {
  it('likes a comment through the API with the session email and shows the confirmed count', async () => {
    session.startSession(PROFILE);
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult({ likesCount: 4 }) });
    mount(fakeComments(loaded([makeComment({ commentId: 'c-1', likesCount: 3 })])));
    const [button] = likeButtons();

    button?.click();
    await settle();

    const request = sentRequest(fetchMock);
    expect(`${request.url.origin}${request.url.pathname}`).toBe(
      `${API_BASE_URL}/api/comments/c-1/like`,
    );
    expect(request.method).toBe('POST');
    expect(request.body).toStrictEqual({ userEmail: TEST_USER_EMAIL });
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.querySelector('.comment-like-button__count')?.textContent).toBe('4');
  });

  it('sends nothing for a guest and opens Auth over the game', () => {
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
    mount(fakeComments(loaded([makeComment()])));

    likeButtons()[0]?.click();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(currentUrl()).toBe(`${START_URL}&auth=login`);
    expect(shownSnackbars()).toStrictEqual([
      { variant: 'warning', message: 'Log in to like comments.' },
    ]);
  });

  it('retires the like buttons of a replaced list', () => {
    session.startSession(PROFILE);
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
    const controller = fakeComments(loaded([makeComment()]));
    mount(controller);
    const [oldButton] = likeButtons();

    controller.emit(loaded([makeComment({ commentId: 'comment-2' })]));
    oldButton?.click();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retires the like buttons once the block leaves the page', async () => {
    session.startSession(PROFILE);
    const fetchMock = stubFetchJson({ data: makeCommentLikeResult() });
    mount(fakeComments(loaded([makeComment()])));
    const [button] = likeButtons();
    await settle();

    section.remove();
    await settle();
    button?.click();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('composer', () => {
  it('is locked for a guest, and its Log in button opens Auth over the game', () => {
    mount(fakeComments(loaded([makeComment()])));

    query<HTMLButtonElement>('.comment-composer__login').click();

    expect(textarea().disabled).toBe(true);
    expect(currentUrl()).toBe(`${START_URL}&auth=login`);
  });

  it('shows the uppercase initial of a signed-in user', () => {
    session.startSession(PROFILE);

    mount(fakeComments(loaded([makeComment()])));

    expect(textarea().disabled).toBe(false);
    expect(query('.comment-composer__avatar').textContent).toBe('S');
  });

  it('follows the session as the user signs in and out', async () => {
    mount(fakeComments(loaded([makeComment()])));

    session.startSession(PROFILE);
    expect(textarea().disabled).toBe(false);

    await session.endSession();
    expect(textarea().disabled).toBe(true);
    expect(query('.comment-composer__avatar').textContent).toBe('');
  });

  it('explains the 500-character limit when the comment is too long', () => {
    session.startSession(PROFILE);
    mount(fakeComments(loaded([makeComment()])));

    typeComment('a'.repeat(501));

    expect(query('.comment-composer__hint').textContent).toBe(
      'Comments can be up to 500 characters (501 now).',
    );
  });

  it('restores the unsent draft and keeps it up to date while typing', () => {
    session.startSession(PROFILE);
    drafts.setCommentDraft('Half-written');
    mount(fakeComments(loaded([makeComment()])));

    expect(textarea().value).toBe('Half-written');

    typeComment('Half-written thought');
    expect(drafts.getCommentDraft()).toBe('Half-written thought');
  });

  it('posts the comment, locks the form meanwhile, then clears it and reloads the comments', async () => {
    session.startSession(PROFILE);
    const response = deferred<Response>();
    const fetchMock = stubFetch(() => response.promise);
    const controller = fakeComments(loaded([makeComment()]));
    mount(controller);
    typeComment('  Great game  ');

    pressEnter();
    await settle();
    expect(textarea().disabled).toBe(true);

    response.resolve(jsonResponse({ data: makeComment({ text: 'Great game' }) }, 201));
    await settle();

    const request = sentRequest(fetchMock);
    expect(request.url.pathname).toBe(`/api/games/${SLUG}/comments`);
    expect(request.body).toStrictEqual({
      userEmail: TEST_USER_EMAIL,
      authorName: 'student',
      text: 'Great game',
    });
    expect(textarea().value).toBe('');
    expect(textarea().disabled).toBe(false);
    expect(controller.reload).toHaveBeenCalledTimes(1);
    expect(drafts.getCommentDraft()).toBe('');
  });

  it('keeps the text and unlocks the form when the server rejects the comment', async () => {
    session.startSession(PROFILE);
    stubFetchJson({ error: 'Text is required' }, 400);
    const controller = fakeComments(loaded([makeComment()]));
    mount(controller);
    typeComment('Great game');

    pressEnter();
    await settle();

    expect(textarea().value).toBe('Great game');
    expect(textarea().disabled).toBe(false);
    expect(controller.reload).not.toHaveBeenCalled();
  });
});

describe('unmounting', () => {
  it('stops following the comments once the block leaves the page', async () => {
    const controller = fakeComments(loaded([makeComment()]));
    mount(controller);
    await settle();

    section.remove();
    await settle();
    controller.emit(activeState({ status: empty }));

    expect(titleText()).toBe('Comments (1)');
  });

  it('stops following the session once the block leaves the page', async () => {
    mount(fakeComments(loaded([makeComment()])));
    await settle();

    section.remove();
    await settle();
    session.startSession(PROFILE);

    expect(textarea().disabled).toBe(true);
  });
});
