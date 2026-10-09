import {
  clearSessionExpiry,
  scheduleSessionExpiry,
  startSessionExpiryWatcher,
} from '../hooks/use-session-expiry';
import {
  APP_SESSION_TTL_MS,
  clearAppSession,
  createAppSessionRecord,
  isAppSessionExpired,
  readAppSession,
  writeAppSession,
  type AppSessionRecord,
} from '../services/app-session-storage';
import { signOutFirebase, type AuthProfile } from '../services/firebase-auth';
import { showSnackbar } from './snackbar-store';

export const SESSION_STATUS = {
  guest: 'guest',
  authenticated: 'authenticated',
} as const;

const { guest, authenticated } = SESSION_STATUS;

export const SESSION_END_REASON = {
  expiry: 'expiry',
  logout: 'logout',
  invalid: 'invalid',
} as const;

const { expiry, logout, invalid } = SESSION_END_REASON;

export type SessionEndReason = (typeof SESSION_END_REASON)[keyof typeof SESSION_END_REASON];

export type SessionState =
  | { status: typeof guest }
  | {
      status: typeof authenticated;
      email: string;
      displayName: string;
      avatarUrl?: string;
      authenticatedAt: number;
    };

type SessionListener = (state: SessionState) => void;

const EXPIRY_MESSAGE = 'Your session has ended. Please log in again.';
const LOGOUT_MESSAGE = "You've logged out.";
const SIGNOUT_ERROR_MESSAGE = 'Signed out of MiniGames, but ending the saved login failed.';

type AuthenticatedSession = Exclude<SessionState, { status: typeof guest }>;

function toAuthenticatedState(record: AppSessionRecord): AuthenticatedSession {
  const { email, displayName, avatarUrl, authenticatedAt } = record;

  return {
    status: authenticated,
    email,
    displayName,
    authenticatedAt,
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

let state: SessionState = { status: guest };
const listeners = new Set<SessionListener>();
let watcherStarted = false;
let endingSession = false;

function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function armExpiry(record: AppSessionRecord): void {
  const delayMs = record.authenticatedAt + APP_SESSION_TTL_MS - Date.now();
  scheduleSessionExpiry(delayMs, () => {
    void endSession({ reason: expiry });
  });
}

export function getSession(): SessionState {
  return state;
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  listener(state);

  return () => {
    listeners.delete(listener);
  };
}

export function startSession(profile: AuthProfile): void {
  const record = createAppSessionRecord(profile);
  writeAppSession(record);
  state = toAuthenticatedState(record);
  armExpiry(record);
  notify();
}

export async function endSession({
  reason = invalid,
}: { reason?: SessionEndReason } = {}): Promise<void> {
  if (endingSession) {
    return;
  }

  endingSession = true;
  clearSessionExpiry();
  clearAppSession();
  state = { status: guest };
  notify();

  try {
    await signOutFirebase();
  } catch {
    showSnackbar({ variant: 'error', message: SIGNOUT_ERROR_MESSAGE });
  } finally {
    endingSession = false;
  }

  if (reason === expiry) {
    showSnackbar({ variant: 'info', message: EXPIRY_MESSAGE });
  }

  if (reason === logout) {
    showSnackbar({ variant: 'success', message: LOGOUT_MESSAGE });
  }
}

export function checkSessionExpiry(): void {
  if (state.status !== authenticated) {
    return;
  }

  if (isAppSessionExpired(state)) {
    void endSession({ reason: expiry });
  }
}

export function restoreSession(): void {
  if (!watcherStarted) {
    watcherStarted = true;
    startSessionExpiryWatcher(checkSessionExpiry);
  }

  const record = readAppSession();

  if (!record) {
    void endSession({ reason: invalid });
    return;
  }

  if (isAppSessionExpired(record)) {
    void endSession({ reason: expiry });
    return;
  }

  state = toAuthenticatedState(record);
  armExpiry(record);
  notify();
}
