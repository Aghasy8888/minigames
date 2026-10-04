import { hrefWithAuth, parseAuthQuery, type AuthDialogMode } from '../utils/auth-dialog-query';
import { syncGameDetailsFromLocation } from './game-details-dialog-store';

export { AUTH_DIALOG_MODE, type AuthDialogMode } from '../utils/auth-dialog-query';

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
  if (mode === state.mode) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithAuth(mode));
  syncGameDetailsFromLocation();
  setState({ mode });
}

/** Closing is its own history entry, so Back reopens the dialog and Forward closes it again. */
export function closeAuthDialog(): void {
  if (state.mode === undefined) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithAuth());
  setState({});
}

export function syncAuthDialogFromLocation(): void {
  const { mode, isCanonical } = parseAuthQuery(globalThis.location.search);

  if (!isCanonical) {
    globalThis.history.replaceState(undefined, '', hrefWithAuth());
  }

  setState({ mode });
}

export function subscribeAuthDialog(listener: AuthDialogListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
