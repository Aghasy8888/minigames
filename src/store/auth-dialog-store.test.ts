// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { AUTH_DIALOG_MODE, type AuthDialogMode } from '../utils/auth-dialog-query';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

const { login, register } = AUTH_DIALOG_MODE;

type AuthDialogStore = typeof import('./auth-dialog-store');
type SessionStore = typeof import('./session-store');
type AuthBusy = typeof import('./auth-busy');
type SnackbarStore = typeof import('./snackbar-store');

const SESSION_KEY = 'minigames:minigames-aghasy:app-session';
const TTL_MS = 5 * 60 * 1000;
const NOW = 1_800_000_000_000;
const PROFILE = { email: 'jane@example.com', displayName: 'Jane Doe' };
const START_URL = '/library?category=puzzle#games';

const ALREADY_SIGNED_IN_SNACKBAR = { variant: 'info', message: "You're already signed in." };
const EXPIRY_SNACKBAR = {
  variant: 'info',
  message: 'Your session has ended. Please log in again.',
};

let authDialog: AuthDialogStore;
let session: SessionStore;
let authBusy: AuthBusy;
let snackbars: SnackbarStore;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

function currentUrl(): string {
  const { pathname, search, hash } = globalThis.location;
  return `${pathname}${search}${hash}`;
}

function openMode(): AuthDialogMode | undefined {
  return authDialog.getAuthDialogState().mode;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

/** Mirrors the router: `popstate` re-reads the URL into the Auth dialog store. */
function syncOnPopState(): void {
  authDialog.syncAuthDialogFromLocation();
}

/** happy-dom fires `popstate` asynchronously, so wait for it before asserting. */
async function traverse(step: () => void): Promise<void> {
  const popped = new Promise<void>((resolve) => {
    globalThis.addEventListener('popstate', () => resolve(), { once: true });
  });
  step();
  await vi.advanceTimersByTimeAsync(0);
  await popped;
}

async function goBack(): Promise<void> {
  await traverse(() => globalThis.history.back());
}

async function goForward(): Promise<void> {
  await traverse(() => globalThis.history.forward());
}

/** Lets a fire-and-forget `endSession` finish awaiting the mocked `signOut`. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
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
  authBusy = await import('./auth-busy');
  snackbars = await import('./snackbar-store');
  authDialog = await import('./auth-dialog-store');
  globalThis.addEventListener('popstate', syncOnPopState);
});

afterEach(() => {
  globalThis.removeEventListener('popstate', syncOnPopState);
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('openAuthDialog', () => {
  it.each([
    { mode: login, url: '/library?category=puzzle&auth=login#games' },
    { mode: register, url: '/library?category=puzzle&auth=register#games' },
  ])('opens $mode for a guest as a new history entry', ({ mode, url }) => {
    const listener = vi.fn();
    authDialog.subscribeAuthDialog(listener);
    const { length } = globalThis.history;

    authDialog.openAuthDialog(mode);

    expect(currentUrl()).toBe(url);
    expect(globalThis.history.length).toBe(length + 1);
    expect(openMode()).toBe(mode);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ mode });
  });

  it('switches login to register as its own entry and keeps the game param', () => {
    globalThis.history.replaceState(undefined, '', '/library?game=snake');
    const { length } = globalThis.history;

    authDialog.openAuthDialog(login);
    authDialog.openAuthDialog(register);

    expect(currentUrl()).toBe('/library?game=snake&auth=register');
    expect(globalThis.history.length).toBe(length + 2);
    expect(openMode()).toBe(register);
  });

  it('adds no entry when the requested mode is already open', () => {
    authDialog.openAuthDialog(login);
    const listener = vi.fn();
    authDialog.subscribeAuthDialog(listener);
    const { length } = globalThis.history;

    authDialog.openAuthDialog(login);

    expect(globalThis.history.length).toBe(length);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stays closed for a signed-in user and shows one "already signed in" Snackbar', () => {
    session.startSession(PROFILE);
    const { length } = globalThis.history;

    authDialog.openAuthDialog(login);

    expect(currentUrl()).toBe(START_URL);
    expect(globalThis.history.length).toBe(length);
    expect(openMode()).toBeUndefined();
    expect(shownSnackbars()).toStrictEqual([ALREADY_SIGNED_IN_SNACKBAR]);
  });

  it('opens normally once an expired session has been ended, with only the expiry Snackbar', async () => {
    session.startSession(PROFILE);
    vi.setSystemTime(NOW + TTL_MS);

    authDialog.openAuthDialog(login);
    await settle();

    expect(session.getSession().status).toBe('guest');
    expect(currentUrl()).toBe('/library?category=puzzle&auth=login#games');
    expect(openMode()).toBe(login);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('does nothing while a sign-in request is in flight', () => {
    authBusy.setAuthBusy(true);
    const { length } = globalThis.history;

    authDialog.openAuthDialog(register);

    expect(globalThis.history.length).toBe(length);
    expect(openMode()).toBeUndefined();
  });
});

describe('closeAuthDialog', () => {
  it('pushes the URL without auth and keeps every other param and the hash', () => {
    globalThis.history.replaceState(undefined, '', '/library?game=snake&category=card#comments');
    authDialog.openAuthDialog(login);
    const { length } = globalThis.history;

    authDialog.closeAuthDialog();

    expect(currentUrl()).toBe('/library?game=snake&category=card#comments');
    expect(globalThis.history.length).toBe(length + 1);
    expect(openMode()).toBeUndefined();
  });

  it('adds no entry when the dialog is already closed', () => {
    const { length } = globalThis.history;

    authDialog.closeAuthDialog();

    expect(globalThis.history.length).toBe(length);
  });

  it('keeps the dialog open while a sign-in request is in flight', () => {
    authDialog.openAuthDialog(login);
    authBusy.setAuthBusy(true);
    const { length } = globalThis.history;

    authDialog.closeAuthDialog();

    expect(currentUrl()).toBe('/library?category=puzzle&auth=login#games');
    expect(globalThis.history.length).toBe(length);
    expect(openMode()).toBe(login);
  });
});

describe('syncAuthDialogFromLocation', () => {
  it.each([
    { name: 'a login deep link', url: '/?auth=login', mode: login },
    { name: 'a register deep link', url: '/library?auth=register', mode: register },
    { name: 'Auth over Game Details', url: '/library?game=snake&auth=login', mode: login },
  ])('opens the dialog from $name without touching history', ({ url, mode }) => {
    globalThis.history.replaceState(undefined, '', url);
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    authDialog.syncAuthDialogFromLocation();

    expect(openMode()).toBe(mode);
    expect(currentUrl()).toBe(url);
    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it('closes an open dialog when the URL has no auth param', () => {
    authDialog.openAuthDialog(login);
    globalThis.history.replaceState(undefined, '', '/library');

    authDialog.syncAuthDialogFromLocation();

    expect(openMode()).toBeUndefined();
  });

  it('drops an unknown mode in place and keeps the other params', () => {
    globalThis.history.replaceState(undefined, '', '/library?auth=admin&category=card#top');
    const { length } = globalThis.history;

    authDialog.syncAuthDialogFromLocation();

    expect(currentUrl()).toBe('/library?category=card#top');
    expect(globalThis.history.length).toBe(length);
    expect(openMode()).toBeUndefined();
  });

  it('drops only auth for a signed-in user, with one Snackbar and no Auth flash', () => {
    session.startSession(PROFILE);
    globalThis.history.replaceState(
      undefined,
      '',
      '/library?game=snake&auth=login&page=2#comments',
    );
    const listener = vi.fn();
    authDialog.subscribeAuthDialog(listener);
    const { length } = globalThis.history;

    authDialog.syncAuthDialogFromLocation();

    expect(currentUrl()).toBe('/library?game=snake&page=2#comments');
    expect(globalThis.history.length).toBe(length);
    expect(openMode()).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    expect(shownSnackbars()).toStrictEqual([ALREADY_SIGNED_IN_SNACKBAR]);
  });

  it('shows no Snackbar for a signed-in user on a URL without auth', () => {
    session.startSession(PROFILE);
    globalThis.history.replaceState(undefined, '', '/library?game=snake');

    authDialog.syncAuthDialogFromLocation();

    expect(currentUrl()).toBe('/library?game=snake');
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('opens a deep link normally after ending an expired session', async () => {
    session.startSession(PROFILE);
    vi.setSystemTime(NOW + TTL_MS);
    globalThis.history.replaceState(undefined, '', '/?auth=register');

    authDialog.syncAuthDialogFromLocation();
    await settle();

    expect(session.getSession().status).toBe('guest');
    expect(currentUrl()).toBe('/?auth=register');
    expect(openMode()).toBe(register);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('opens a deep link normally when the stored session record is invalid', async () => {
    localStorage.setItem(SESSION_KEY, '{not json');
    globalThis.history.replaceState(undefined, '', '/?auth=login');

    session.restoreSession();
    authDialog.syncAuthDialogFromLocation();
    await settle();

    expect(currentUrl()).toBe('/?auth=login');
    expect(openMode()).toBe(login);
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('puts the open mode back into the URL while a sign-in request is in flight', () => {
    authDialog.openAuthDialog(register);
    authBusy.setAuthBusy(true);
    globalThis.history.replaceState(undefined, '', START_URL);

    authDialog.syncAuthDialogFromLocation();

    expect(currentUrl()).toBe('/library?category=puzzle&auth=register#games');
    expect(openMode()).toBe(register);
  });

  it('ignores an Auth URL while busy with the dialog closed', () => {
    authBusy.setAuthBusy(true);
    globalThis.history.replaceState(undefined, '', '/?auth=login');

    authDialog.syncAuthDialogFromLocation();

    expect(currentUrl()).toBe('/?auth=login');
    expect(openMode()).toBeUndefined();
  });
});

describe('Back / Forward through Auth history', () => {
  it('steps through every open and close in order, both ways', async () => {
    const loginUrl = '/library?category=puzzle&auth=login#games';
    const registerUrl = '/library?category=puzzle&auth=register#games';
    const { length } = globalThis.history;

    authDialog.openAuthDialog(login);
    authDialog.closeAuthDialog();
    authDialog.openAuthDialog(register);
    authDialog.closeAuthDialog();

    expect(globalThis.history.length).toBe(length + 4);
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    const backSteps = [
      { url: registerUrl, mode: register },
      { url: START_URL, mode: undefined },
      { url: loginUrl, mode: login },
      { url: START_URL, mode: undefined },
    ];
    for (const { url, mode } of backSteps) {
      await goBack();
      expect(currentUrl()).toBe(url);
      expect(openMode()).toBe(mode);
    }

    const forwardSteps = [
      { url: loginUrl, mode: login },
      { url: START_URL, mode: undefined },
      { url: registerUrl, mode: register },
      { url: START_URL, mode: undefined },
    ];
    for (const { url, mode } of forwardSteps) {
      await goForward();
      expect(currentUrl()).toBe(url);
      expect(openMode()).toBe(mode);
    }

    expect(pushState).not.toHaveBeenCalled();
  });

  it('drops only auth when Back lands on an Auth URL after signing in', async () => {
    globalThis.history.replaceState(undefined, '', '/library?game=snake');
    authDialog.openAuthDialog(login);
    session.startSession(PROFILE);
    authDialog.closeAuthDialog();
    const pushState = vi.spyOn(globalThis.history, 'pushState');
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    await goBack();

    // happy-dom's replaceState drops forward entries, so `history.length` can't show "no new
    // entry" after Back; the spies prove the URL was replaced in place instead.
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(undefined, '', '/library?game=snake');
    expect(pushState).not.toHaveBeenCalled();
    expect(currentUrl()).toBe('/library?game=snake');
    expect(openMode()).toBeUndefined();
    expect(shownSnackbars()).toStrictEqual([ALREADY_SIGNED_IN_SNACKBAR]);
  });
});

describe('subscribeAuthDialog', () => {
  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = authDialog.subscribeAuthDialog(listener);

    unsubscribe();
    authDialog.openAuthDialog(login);

    expect(listener).not.toHaveBeenCalled();
  });
});
