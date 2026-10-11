// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { AppSessionRecord } from '../services/app-session-storage';
import { expireStoredSession } from '../test-support/app-session';

vi.mock('../services/firebase-auth', () => ({ signOutFirebase: vi.fn() }));

type SessionStore = typeof import('./session-store');
type SnackbarStore = typeof import('./snackbar-store');

const SESSION_KEY = 'minigames:minigames-aghasy:app-session';
const TTL_MS = 5 * 60 * 1000;
const NOW = 1_800_000_000_000;
const OTHER_KEY = 'other-app:setting';

const EXPIRY_SNACKBAR = {
  variant: 'info',
  message: 'Your session has ended. Please log in again.',
};
const LOGOUT_SNACKBAR = { variant: 'success', message: "You've logged out." };
const SIGNOUT_ERROR_SNACKBAR = {
  variant: 'error',
  message: 'Signed out of MiniGames, but ending the saved login failed.',
};

const PROFILE = { email: 'jane@example.com', displayName: 'Jane Doe' };

let store: SessionStore;
let snackbars: SnackbarStore;
let signOut: MockInstance<() => Promise<void>>;
let addListenerSpy: MockInstance<typeof document.addEventListener>;

function storeRecord(overrides: Partial<AppSessionRecord> = {}): void {
  const record: AppSessionRecord = { ...PROFILE, authenticatedAt: NOW - 60_000, ...overrides };
  localStorage.setItem(SESSION_KEY, JSON.stringify(record));
}

function storedRecord(): unknown {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw === null ? undefined : JSON.parse(raw);
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

function becomeVisible(): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Lets a fire-and-forget `endSession` finish awaiting the mocked `signOut`. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise?.() };
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  localStorage.setItem(OTHER_KEY, 'kept');
  addListenerSpy = vi.spyOn(document, 'addEventListener');
  vi.resetModules();
  const firebase = await import('../services/firebase-auth');
  signOut = vi.mocked(firebase.signOutFirebase);
  signOut.mockReset();
  signOut.mockReturnValue(Promise.resolve());
  store = await import('./session-store');
  snackbars = await import('./snackbar-store');
});

afterEach(() => {
  for (const [type, listener] of addListenerSpy.mock.calls) {
    document.removeEventListener(type, listener);
  }
  vi.useRealTimers();
});

describe('startSession', () => {
  it('writes the record once under the session key, stamped with the current time', () => {
    const setItem = vi.spyOn(localStorage, 'setItem');

    store.startSession(PROFILE);

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(SESSION_KEY, expect.any(String));
    expect(storedRecord()).toStrictEqual({ ...PROFILE, authenticatedAt: NOW });
  });

  it('stores the avatar URL when the profile has one', () => {
    store.startSession({ ...PROFILE, avatarUrl: 'https://example.com/a.png' });

    expect(storedRecord()).toStrictEqual({
      ...PROFILE,
      authenticatedAt: NOW,
      avatarUrl: 'https://example.com/a.png',
    });
    expect(store.getSession()).toMatchObject({ avatarUrl: 'https://example.com/a.png' });
  });

  it('falls back to the email local part when the profile has no display name', () => {
    store.startSession({ email: 'jane@example.com' });

    expect(storedRecord()).toStrictEqual({
      email: 'jane@example.com',
      displayName: 'jane',
      authenticatedAt: NOW,
    });
  });

  it('switches subscribers to the authenticated state', () => {
    const listener = vi.fn();
    store.subscribeSession(listener);

    store.startSession(PROFILE);

    expect(listener).toHaveBeenLastCalledWith({
      status: 'authenticated',
      ...PROFILE,
      authenticatedAt: NOW,
    });
    expect(store.getUserEmail()).toBe(PROFILE.email);
  });

  it('expires on the timer exactly TTL after authentication', async () => {
    store.startSession(PROFILE);

    await vi.advanceTimersByTimeAsync(TTL_MS - 1);

    expect(store.getSession().status).toBe('authenticated');
    expect(signOut).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(storedRecord()).toBeUndefined();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('replaces the previous expiry timer when a new session starts', async () => {
    store.startSession(PROFILE);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    store.startSession({ email: 'max@example.com', displayName: 'Max' });

    await vi.advanceTimersByTimeAsync(TTL_MS - 1);

    expect(store.getUserEmail()).toBe('max@example.com');
    expect(signOut).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(store.getSession().status).toBe('guest');
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });
});

describe('restoreSession', () => {
  it('restores a valid record without rewriting it', () => {
    storeRecord({ avatarUrl: 'https://example.com/a.png' });
    const raw = localStorage.getItem(SESSION_KEY);
    const setItem = vi.spyOn(localStorage, 'setItem');

    store.restoreSession();

    expect(store.getSession()).toStrictEqual({
      status: 'authenticated',
      ...PROFILE,
      avatarUrl: 'https://example.com/a.png',
      authenticatedAt: NOW - 60_000,
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_KEY)).toBe(raw);
    expect(signOut).not.toHaveBeenCalled();
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('keeps the original deadline: a reload never extends the session', async () => {
    storeRecord({ authenticatedAt: NOW - 4 * 60_000 });

    store.restoreSession();
    await vi.advanceTimersByTimeAsync(60_000 - 1);

    expect(store.getSession().status).toBe('authenticated');

    await vi.advanceTimersByTimeAsync(1);

    expect(store.getSession().status).toBe('guest');
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('restores a record one millisecond before its deadline', () => {
    storeRecord({ authenticatedAt: NOW - TTL_MS + 1 });

    store.restoreSession();

    expect(store.getSession().status).toBe('authenticated');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('ends a record that reached its deadline with one expiry Snackbar', async () => {
    storeRecord({ authenticatedAt: NOW - TTL_MS });

    store.restoreSession();
    await settle();

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(storedRecord()).toBeUndefined();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it.each([
    { name: 'invalid JSON', raw: '{not json' },
    { name: 'a JSON string', raw: '"session"' },
    { name: 'a missing email', raw: JSON.stringify({ displayName: 'Jane', authenticatedAt: NOW }) },
    {
      name: 'a string authenticatedAt',
      raw: JSON.stringify({ ...PROFILE, authenticatedAt: String(NOW) }),
    },
    {
      name: 'a numeric avatarUrl',
      raw: JSON.stringify({ ...PROFILE, authenticatedAt: NOW, avatarUrl: 1 }),
    },
    {
      name: 'a future authenticatedAt',
      raw: JSON.stringify({ ...PROFILE, authenticatedAt: NOW + 1 }),
    },
  ])('treats a record with $name as a guest and signs out of Firebase', async ({ raw }) => {
    localStorage.setItem(SESSION_KEY, raw);

    expect(() => store.restoreSession()).not.toThrow();
    await settle();

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('starts as a guest with no Snackbar when nothing is stored', async () => {
    store.restoreSession();
    await settle();

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('registers the visibility watcher only once', () => {
    storeRecord();

    store.restoreSession();
    store.restoreSession();

    const visibilityListeners = addListenerSpy.mock.calls.filter(
      ([type]) => type === 'visibilitychange',
    );
    expect(visibilityListeners).toHaveLength(1);
  });
});

describe('expiry on visibilitychange', () => {
  it('ends the session when the page becomes visible after the deadline', async () => {
    storeRecord({ authenticatedAt: NOW });
    store.restoreSession();

    vi.setSystemTime(NOW + TTL_MS);
    becomeVisible();
    await settle();

    expect(store.getSession().status).toBe('guest');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('ends the session when the page becomes visible after the stored record was edited to expire', async () => {
    storeRecord({ authenticatedAt: NOW });
    store.restoreSession();

    expireStoredSession();
    becomeVisible();
    await settle();

    expect(store.getSession().status).toBe('guest');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('keeps the session when the page becomes visible before the deadline', async () => {
    storeRecord({ authenticatedAt: NOW });
    store.restoreSession();

    vi.setSystemTime(NOW + TTL_MS - 1);
    becomeVisible();
    await settle();

    expect(store.getSession().status).toBe('authenticated');
    expect(signOut).not.toHaveBeenCalled();
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('shows one Snackbar when the timer fires after a visibility expiry', async () => {
    storeRecord({ authenticatedAt: NOW });
    store.restoreSession();

    vi.setSystemTime(NOW + TTL_MS);
    becomeVisible();
    await vi.advanceTimersByTimeAsync(TTL_MS);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });
});

describe('checkSessionExpiry', () => {
  it('does nothing for a guest', async () => {
    store.checkSessionExpiry();
    await settle();

    expect(signOut).not.toHaveBeenCalled();
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it.each([
    { name: 'one millisecond before the deadline', elapsedMs: TTL_MS - 1, status: 'authenticated' },
    { name: 'at the deadline', elapsedMs: TTL_MS, status: 'guest' },
  ])('leaves the session $status $name', async ({ elapsedMs, status }) => {
    store.startSession(PROFILE);

    vi.setSystemTime(NOW + elapsedMs);
    store.checkSessionExpiry();
    await settle();

    expect(store.getSession().status).toBe(status);
  });

  it('ends the session when the stored authenticatedAt is moved past the lifetime after load', async () => {
    store.startSession(PROFILE);

    expireStoredSession();
    store.checkSessionExpiry();
    await settle();

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it.each([
    {
      name: 'removed',
      edit: () => {
        localStorage.removeItem(SESSION_KEY);
      },
    },
    {
      name: 'not valid JSON',
      edit: () => {
        localStorage.setItem(SESSION_KEY, '{not json');
      },
    },
    {
      name: 'missing a required field',
      edit: () => {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ email: PROFILE.email }));
      },
    },
  ])('ends the session when the stored key is $name after load', async ({ edit }) => {
    store.startSession(PROFILE);

    edit();
    store.checkSessionExpiry();
    await settle();

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('never extends the session when the stored authenticatedAt is moved later', async () => {
    store.startSession(PROFILE);
    vi.setSystemTime(NOW + TTL_MS - 1000);
    storeRecord({ authenticatedAt: NOW + TTL_MS - 1000 });

    vi.setSystemTime(NOW + TTL_MS);
    store.checkSessionExpiry();
    await settle();

    expect(store.getSession().status).toBe('guest');
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('shows exactly one Snackbar when several checks see the same expiry', async () => {
    store.startSession(PROFILE);

    vi.setSystemTime(NOW + TTL_MS);
    store.checkSessionExpiry();
    store.checkSessionExpiry();
    await vi.advanceTimersByTimeAsync(TTL_MS);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });
});

describe('endSession', () => {
  it('logs out: removes only the session key, signs out, and shows one success Snackbar', async () => {
    store.startSession(PROFILE);

    await store.endSession({ reason: 'logout' });

    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(store.getUserEmail()).toBeUndefined();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(OTHER_KEY)).toBe('kept');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([LOGOUT_SNACKBAR]);
  });

  it('switches to guest before Firebase sign-out finishes', async () => {
    const signOutCall = deferred();
    signOut.mockReturnValue(signOutCall.promise);
    store.startSession(PROFILE);
    const listener = vi.fn();
    store.subscribeSession(listener);

    const ending = store.endSession({ reason: 'logout' });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(store.getSession()).toStrictEqual({ status: 'guest' });
    expect(listener).toHaveBeenLastCalledWith({ status: 'guest' });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(shownSnackbars()).toStrictEqual([]);

    signOutCall.resolve();
    await ending;

    expect(shownSnackbars()).toStrictEqual([LOGOUT_SNACKBAR]);
  });

  it.each([
    { name: 'logout', reason: 'logout' as const },
    { name: 'expiry', reason: 'expiry' as const },
  ])(
    'stays guest and shows only the error Snackbar when sign-out fails on $name',
    async ({ reason }) => {
      signOut.mockReturnValue(Promise.reject(new Error('network')));
      store.startSession(PROFILE);

      await expect(store.endSession({ reason })).resolves.toBeUndefined();

      expect(store.getSession()).toStrictEqual({ status: 'guest' });
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(shownSnackbars()).toStrictEqual([SIGNOUT_ERROR_SNACKBAR]);
    },
  );

  it('can end a later session after a failed sign-out', async () => {
    signOut.mockReturnValueOnce(Promise.reject(new Error('network')));
    store.startSession(PROFILE);
    await store.endSession({ reason: 'logout' });

    store.startSession(PROFILE);
    await store.endSession({ reason: 'logout' });

    expect(signOut).toHaveBeenCalledTimes(2);
    expect(store.getSession().status).toBe('guest');
    expect(shownSnackbars()).toStrictEqual([SIGNOUT_ERROR_SNACKBAR, LOGOUT_SNACKBAR]);
  });

  it('ignores a second end while the first is still signing out', async () => {
    const signOutCall = deferred();
    signOut.mockReturnValue(signOutCall.promise);
    store.startSession(PROFILE);

    const first = store.endSession({ reason: 'logout' });
    const second = store.endSession({ reason: 'logout' });
    signOutCall.resolve();
    await Promise.all([first, second]);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([LOGOUT_SNACKBAR]);
  });

  it('cancels the expiry timer so a logged-out session never expires later', async () => {
    store.startSession(PROFILE);

    await store.endSession({ reason: 'logout' });
    await vi.advanceTimersByTimeAsync(TTL_MS);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([LOGOUT_SNACKBAR]);
  });

  it('shows no Snackbar when the reason is left at its default', async () => {
    store.startSession(PROFILE);

    await store.endSession();

    expect(store.getSession().status).toBe('guest');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([]);
  });
});

describe('requireActiveSession', () => {
  it('blocks a guest without reporting an expiry', () => {
    expect(store.requireActiveSession()).toStrictEqual({ allowed: false, expired: false });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('allows an active session with its email and display name', () => {
    store.startSession(PROFILE);
    vi.setSystemTime(NOW + TTL_MS - 1);

    expect(store.requireActiveSession()).toStrictEqual({
      allowed: true,
      userEmail: PROFILE.email,
      displayName: PROFILE.displayName,
    });
  });

  it('blocks and ends a session that just expired, with one expiry Snackbar', async () => {
    store.startSession(PROFILE);
    vi.setSystemTime(NOW + TTL_MS);

    expect(store.requireActiveSession()).toStrictEqual({ allowed: false, expired: true });
    await settle();

    expect(store.getSession().status).toBe('guest');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('blocks a protected action once the stored session is edited to an expired time, without a reload', async () => {
    store.startSession(PROFILE);

    expireStoredSession();

    expect(store.requireActiveSession()).toStrictEqual({ allowed: false, expired: true });
    await settle();

    expect(store.getSession().status).toBe('guest');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(shownSnackbars()).toStrictEqual([EXPIRY_SNACKBAR]);
  });

  it('blocks after logout without reporting an expiry', async () => {
    store.startSession(PROFILE);
    await store.endSession({ reason: 'logout' });

    expect(store.requireActiveSession()).toStrictEqual({ allowed: false, expired: false });
  });
});

describe('subscribeSession', () => {
  it('calls the listener with the current state right away', () => {
    const listener = vi.fn();

    store.subscribeSession(listener);

    expect(listener).toHaveBeenCalledExactlyOnceWith({ status: 'guest' });
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeSession(listener);

    unsubscribe();
    store.startSession(PROFILE);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
