export type AuthDialogMode = 'login' | 'register';

export interface AuthDialogState {
  isOpen: boolean;
  mode: AuthDialogMode;
}

type AuthDialogListener = (state: AuthDialogState) => void;

let state: AuthDialogState = { isOpen: false, mode: 'login' };
const listeners = new Set<AuthDialogListener>();

function setState(next: AuthDialogState): void {
  state = next;

  for (const listener of listeners) {
    listener(state);
  }
}

export function getAuthDialogState(): AuthDialogState {
  return state;
}

export function openAuthDialog(mode: AuthDialogMode): void {
  setState({ isOpen: true, mode });
}

export function closeAuthDialog(): void {
  if (!state.isOpen) {
    return;
  }

  setState({ ...state, isOpen: false });
}

export function subscribeAuthDialog(listener: AuthDialogListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
