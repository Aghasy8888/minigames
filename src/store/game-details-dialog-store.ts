import { hrefWithGame, parseGameQuery } from '../utils/game-dialog-query';

export interface GameDetailsDialogState {
  /** Slug from `?game=`; undefined means the dialog is closed. */
  slug?: string;
}

type GameDetailsDialogListener = (state: GameDetailsDialogState) => void;

type GameDialogHistoryState = { gameDialog: true };

let state: GameDetailsDialogState = {};
/** Set while our `history.back()` is in flight, so a second close request can't go back twice. */
let isGoingBack = false;
const listeners = new Set<GameDetailsDialogListener>();

function setState(next: GameDetailsDialogState): void {
  if (next.slug === state.slug) {
    return;
  }

  state = next;

  for (const listener of listeners) {
    listener(state);
  }
}

function isInAppEntry(historyState: unknown): historyState is GameDialogHistoryState {
  return (
    typeof historyState === 'object' &&
    historyState !== null &&
    'gameDialog' in historyState &&
    historyState.gameDialog === true
  );
}

export function getGameDetailsDialogState(): GameDetailsDialogState {
  return state;
}

export function openGameDetailsDialog(slug: string): void {
  if (slug === state.slug) {
    return;
  }

  isGoingBack = false;
  const historyState: GameDialogHistoryState = { gameDialog: true };
  globalThis.history.pushState(historyState, '', hrefWithGame(slug));
  setState({ slug });
}

/**
 * Opened in-app (we pushed the entry) → go back to the underlying URL; opened from a deep link →
 * drop `game` in place so no history entry is left behind.
 */
export function closeGameDetailsDialog(): void {
  if (state.slug === undefined || isGoingBack) {
    return;
  }

  if (isInAppEntry(globalThis.history.state)) {
    isGoingBack = true;
    globalThis.history.back();
    return;
  }

  globalThis.history.replaceState(undefined, '', hrefWithGame());
  setState({});
}

export function syncGameDetailsFromLocation(): void {
  isGoingBack = false;
  const { slug, isCanonical } = parseGameQuery(globalThis.location.search);

  if (!isCanonical) {
    globalThis.history.replaceState(undefined, '', hrefWithGame());
  }

  setState({ slug });
}

export function subscribeGameDetailsDialog(listener: GameDetailsDialogListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
