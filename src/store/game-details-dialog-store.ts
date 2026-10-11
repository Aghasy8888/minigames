import { hrefWithGame, parseGameQuery } from '../utils/game-dialog-query';
import { clearCommentDraft } from './comment-draft-store';
import { checkSessionExpiry } from './session-store';

export interface GameDetailsDialogState {
  /** Slug from `?game=`; undefined means the dialog is closed. */
  slug?: string;
}

type GameDetailsDialogListener = (state: GameDetailsDialogState) => void;

let state: GameDetailsDialogState = {};
const listeners = new Set<GameDetailsDialogListener>();

function setState(next: GameDetailsDialogState): void {
  if (next.slug === state.slug) {
    return;
  }

  state = next;
  clearCommentDraft();

  for (const listener of listeners) {
    listener(state);
  }
}

export function getGameDetailsDialogState(): GameDetailsDialogState {
  return state;
}

export function openGameDetailsDialog(slug: string): void {
  checkSessionExpiry();

  if (slug === state.slug) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithGame(slug));
  setState({ slug });
}

export function closeGameDetailsDialog(): void {
  checkSessionExpiry();

  if (state.slug === undefined) {
    return;
  }

  globalThis.history.pushState(undefined, '', hrefWithGame());
  setState({});
}

/** Unknown slug: replace the bad URL so it never becomes a Back / Forward step. */
export function dismissMissingGameDialog(): void {
  if (state.slug === undefined) {
    return;
  }

  globalThis.history.replaceState(undefined, '', hrefWithGame());
  setState({});
}

export function syncGameDetailsFromLocation(): void {
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
