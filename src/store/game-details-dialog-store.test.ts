// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { expireStoredSession } from '../test-support/app-session';
import { currentUrl, goBack, goForward } from '../test-support/history';
import { SESSION_STATUS } from './session-store';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { guest, authenticated } = SESSION_STATUS;

const NOW = 1_800_000_000_000;
const TTL_MS = 5 * 60 * 1000;
const START_URL = '/library?category=puzzle#games';

let dialog: typeof import('./game-details-dialog-store');
let draft: typeof import('./comment-draft-store');
let session: typeof import('./session-store');
let addListenerSpy: MockInstance<typeof document.addEventListener>;

function urlWithGame(slug: string | undefined): string {
  return slug === undefined ? START_URL : `/library?category=puzzle&game=${slug}#games`;
}

function openSlug(): string | undefined {
  return dialog.getGameDetailsDialogState().slug;
}

function subscribeListener(): MockInstance<(state: object) => void> {
  const listener = vi.fn();
  dialog.subscribeGameDetailsDialog(listener);
  return listener;
}

/** Mirrors the router: `popstate` re-reads the URL into the Game Details store. */
function syncOnPopState(): void {
  dialog.syncGameDetailsFromLocation();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  globalThis.history.replaceState(undefined, '', START_URL);
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  vi.mocked(firebase.signOutFirebase).mockReset();
  vi.mocked(firebase.signOutFirebase).mockReturnValue(Promise.resolve());
  session = await import('./session-store');
  draft = await import('./comment-draft-store');
  dialog = await import('./game-details-dialog-store');
});

afterEach(() => {
  globalThis.removeEventListener('popstate', syncOnPopState);
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('openGameDetailsDialog', () => {
  it('pushes ?game= and keeps the other params and the hash', () => {
    const listener = subscribeListener();
    const { length } = globalThis.history;

    dialog.openGameDetailsDialog('cat-mail-co');

    expect(currentUrl()).toBe('/library?category=puzzle&game=cat-mail-co#games');
    expect(globalThis.history.length).toBe(length + 1);
    expect(openSlug()).toBe('cat-mail-co');
    expect(listener).toHaveBeenCalledExactlyOnceWith({ slug: 'cat-mail-co' });
  });

  it('drops a stale auth param when opening a game', () => {
    globalThis.history.replaceState(undefined, '', '/?auth=login');

    dialog.openGameDetailsDialog('cat-mail-co');

    expect(currentUrl()).toBe('/?game=cat-mail-co');
  });

  it('does nothing when the same game is already open', () => {
    dialog.openGameDetailsDialog('cat-mail-co');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    dialog.openGameDetailsDialog('cat-mail-co');

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
  });

  it('pushes a new entry when switching to another game', () => {
    dialog.openGameDetailsDialog('cat-mail-co');
    const { length } = globalThis.history;

    dialog.openGameDetailsDialog('snake');

    expect(currentUrl()).toBe('/library?category=puzzle&game=snake#games');
    expect(globalThis.history.length).toBe(length + 1);
    expect(openSlug()).toBe('snake');
  });

  it('ends an expired session and still opens in Guest Mode', () => {
    session.startSession({ email: 'student@rs.school', displayName: 'Student' });
    vi.setSystemTime(NOW + TTL_MS);

    dialog.openGameDetailsDialog('cat-mail-co');

    expect(session.getSession().status).toBe(guest);
    expect(openSlug()).toBe('cat-mail-co');
  });

  it('opens with no expiry Snackbar when only the stored session was edited to expire', async () => {
    const snackbars = await import('./snackbar-store');
    session.startSession({ email: 'student@rs.school', displayName: 'Student' });
    expireStoredSession();

    dialog.openGameDetailsDialog('cat-mail-co');

    expect(session.getSession().status).toBe(authenticated);
    expect(snackbars.getSnackbars()).toStrictEqual([]);
    expect(openSlug()).toBe('cat-mail-co');
  });
});

describe('closeGameDetailsDialog', () => {
  it('pushes the URL without game and keeps the other params and the hash', () => {
    dialog.openGameDetailsDialog('cat-mail-co');
    const listener = subscribeListener();
    const { length } = globalThis.history;

    dialog.closeGameDetailsDialog();

    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length + 1);
    expect(openSlug()).toBeUndefined();
    expect(listener).toHaveBeenCalledExactlyOnceWith({});
  });

  it('does nothing when no game is open', () => {
    const listener = subscribeListener();
    const { length } = globalThis.history;

    dialog.closeGameDetailsDialog();

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
  });

  it('ends an expired session and still closes', () => {
    dialog.openGameDetailsDialog('cat-mail-co');
    session.startSession({ email: 'student@rs.school', displayName: 'Student' });
    vi.setSystemTime(NOW + TTL_MS);

    dialog.closeGameDetailsDialog();

    expect(session.getSession().status).toBe(guest);
    expect(currentUrl()).toBe(START_URL);
  });
});

describe('dismissMissingGameDialog', () => {
  it('replaces the unknown game URL so it never becomes a history step', () => {
    dialog.openGameDetailsDialog('no-such-game');
    const listener = subscribeListener();
    const pushState = vi.spyOn(globalThis.history, 'pushState');
    const { length } = globalThis.history;

    dialog.dismissMissingGameDialog();

    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length);
    expect(pushState).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledExactlyOnceWith({});
  });

  it('does nothing when no game is open', () => {
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    dialog.dismissMissingGameDialog();

    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('syncGameDetailsFromLocation', () => {
  it.each([
    { name: 'a game deep link', url: '/?game=cat-mail-co', slug: 'cat-mail-co' },
    { name: 'a URL without game', url: '/library', slug: undefined },
    {
      name: 'a game under Auth',
      url: '/library?game=cat-mail-co&auth=login',
      slug: 'cat-mail-co',
    },
  ])('opens from $name without touching the URL', ({ url, slug }) => {
    globalThis.history.replaceState(undefined, '', url);
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    dialog.syncGameDetailsFromLocation();

    expect(openSlug()).toBe(slug);
    expect(currentUrl()).toBe(url);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'uppercase letters', game: 'Cat-Mail' },
    { name: 'a trailing dash', game: 'cat-' },
    { name: 'an empty value', game: '' },
  ])('drops an invalid game id with $name in place', ({ game }) => {
    globalThis.history.replaceState(undefined, '', `/library?game=${game}&page=2`);
    const { length } = globalThis.history;

    dialog.syncGameDetailsFromLocation();

    expect(currentUrl()).toBe('/library?page=2');
    expect(globalThis.history.length).toBe(length);
    expect(openSlug()).toBeUndefined();
  });
});

describe('comment draft', () => {
  it.each([
    { name: 'another game opens', act: () => dialog.openGameDetailsDialog('snake') },
    { name: 'the dialog closes', act: () => dialog.closeGameDetailsDialog() },
    { name: 'the dialog is dismissed', act: () => dialog.dismissMissingGameDialog() },
  ])('is cleared when $name', ({ act }) => {
    dialog.openGameDetailsDialog('cat-mail-co');
    draft.setCommentDraft('Great game');

    act();

    expect(draft.getCommentDraft()).toBe('');
  });

  it('is kept while Auth opens over the same game', () => {
    dialog.openGameDetailsDialog('cat-mail-co');
    draft.setCommentDraft('Great game');
    const listener = subscribeListener();

    globalThis.history.pushState(
      undefined,
      '',
      `${globalThis.location.pathname}?game=cat-mail-co&auth=login`,
    );
    dialog.syncGameDetailsFromLocation();

    expect(draft.getCommentDraft()).toBe('Great game');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Back / Forward through Game Details history', () => {
  it('steps through every open and close in order, both ways', async () => {
    globalThis.addEventListener('popstate', syncOnPopState);
    const { length } = globalThis.history;

    dialog.openGameDetailsDialog('game-one');
    dialog.closeGameDetailsDialog();
    dialog.openGameDetailsDialog('game-one');
    dialog.closeGameDetailsDialog();
    dialog.openGameDetailsDialog('game-two');
    dialog.closeGameDetailsDialog();
    dialog.openGameDetailsDialog('game-three');

    expect(globalThis.history.length).toBe(length + 7);
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    const backSteps = [
      undefined,
      'game-two',
      undefined,
      'game-one',
      undefined,
      'game-one',
      undefined,
    ];
    for (const slug of backSteps) {
      await goBack();
      expect(currentUrl()).toBe(urlWithGame(slug));
      expect(openSlug()).toBe(slug);
    }

    const forwardSteps = [
      'game-one',
      undefined,
      'game-one',
      undefined,
      'game-two',
      undefined,
      'game-three',
    ];
    for (const slug of forwardSteps) {
      await goForward();
      expect(currentUrl()).toBe(urlWithGame(slug));
      expect(openSlug()).toBe(slug);
    }

    expect(pushState).not.toHaveBeenCalled();
  });
});

describe('subscribeGameDetailsDialog', () => {
  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = dialog.subscribeGameDetailsDialog(listener);

    unsubscribe();
    dialog.openGameDetailsDialog('cat-mail-co');

    expect(listener).not.toHaveBeenCalled();
  });
});
