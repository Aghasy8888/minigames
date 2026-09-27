export interface GameDetailsDialogState {
  isOpen: boolean;
}

type GameDetailsDialogListener = (state: GameDetailsDialogState) => void;

let state: GameDetailsDialogState = { isOpen: false };
const listeners = new Set<GameDetailsDialogListener>();

function setState(next: GameDetailsDialogState): void {
  state = next;

  for (const listener of listeners) {
    listener(state);
  }
}

export function getGameDetailsDialogState(): GameDetailsDialogState {
  return state;
}

export function openGameDetailsDialog(): void {
  setState({ isOpen: true });
}

export function closeGameDetailsDialog(): void {
  if (!state.isOpen) {
    return;
  }

  setState({ isOpen: false });
}

export function subscribeGameDetailsDialog(listener: GameDetailsDialogListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
