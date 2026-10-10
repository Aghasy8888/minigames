import { hrefWithAuth, parseAuthQuery, type AuthDialogMode } from '../utils/auth-dialog-query';
import { isAuthBusy } from './auth-busy';
import { SESSION_STATUS, checkSessionExpiry, getSession } from './session-store';
import { showSnackbar } from './snackbar-store';

export { AUTH_DIALOG_MODE, type AuthDialogMode } from '../utils/auth-dialog-query';

const { authenticated } = SESSION_STATUS;

const ALREADY_AUTHENTICATED_MESSAGE = "You're already signed in.";

/** Runs after `checkSessionExpiry()`, so an expired or invalid session already counts as a guest. */
function hasActiveSession(): boolean {
  return getSession().status === authenticated;
}

function showAlreadyAuthenticated(): void {
  showSnackbar({ variant: 'info', message: ALREADY_AUTHENTICATED_MESSAGE });
}

export interface AuthDialogState {
  /** Mode from `?auth=`; undefined means the dialog is closed. */
  mode?: AuthDialogMode;
}

type AuthDialogListener = (state: AuthDialogState) => void;

let state: AuthDialogState = {};
const listeners = new Set<AuthDialogListener>();

function setState(next: AuthDialogState): void {
  if (next.mode === state.mode) {
    return;
  }

  state = next;

  for (const listener of listeners) {
    listener(state);
  }
}

export function getAuthDialogState(): AuthDialogState {
  return state;
}

/** Opens the dialog or switches login / register; each call is its own history entry. */
export function openAuthDialog(mode: AuthDialogMode): void {
  checkSessionExpiry();

  if (isAuthBusy()) {
    return;
  }

  if (hasActiveSession()) {
    showAlreadyAuthenticated();
    return;
  }

  if (mode === state.mode) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithAuth(mode));
  setState({ mode });
}

/** Closing is its own history entry, so Back reopens the dialog and Forward closes it again. */
export function closeAuthDialog(): void {
  if (isAuthBusy()) {
    return;
  }

  if (state.mode === undefined) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithAuth());
  setState({});
}

export function syncAuthDialogFromLocation(): void {
  checkSessionExpiry();

  if (isAuthBusy()) {
    const pendingMode = state.mode;
    if (pendingMode !== undefined) {
      globalThis.history.replaceState(undefined, '', hrefWithAuth(pendingMode));
    }
    return;
  }

  const { mode, isCanonical } = parseAuthQuery(globalThis.location.search);

  if (!isCanonical) {
    globalThis.history.replaceState(undefined, '', hrefWithAuth());
  }

  // Deep link or Back / Forward to an Auth URL while signed in: drop only `auth` in place
  if (mode !== undefined && hasActiveSession()) {
    globalThis.history.replaceState(undefined, '', hrefWithAuth());
    setState({});
    showAlreadyAuthenticated();
    return;
  }

  setState({ mode });
}

export function subscribeAuthDialog(listener: AuthDialogListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
