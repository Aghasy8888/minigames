import { ApiError, gamesApi, type GameDetails } from '../services/games-api-provider';
import {
  closeGameDetailsDialog,
  getGameDetailsDialogState,
  subscribeGameDetailsDialog,
} from '../store/game-details-dialog-store';
import { showSnackbar } from '../store/snackbar-store';
import { useLoadState, type LoadState, type LoadStateController } from './use-load-state';

const FALLBACK_ERROR_MESSAGE = 'Game details are unavailable right now. Please try again.';
const RETRY_SUCCESS_MESSAGE = 'Game details loaded';
const NOT_FOUND_MESSAGE = 'This game could not be found.';
const NOT_FOUND_STATUS = 404;

export type GameDetailsState =
  | { status: 'idle' }
  | { status: 'loading'; slug: string }
  | { status: 'success'; slug: string; game: GameDetails }
  | { status: 'error'; slug: string; message: string; retry: () => void };

export type GameDetailsController = {
  getState: () => GameDetailsState;
  subscribe: (listener: (state: GameDetailsState) => void) => () => void;
  destroy: () => void;
};

function toGameDetailsState(
  slug: string,
  state: LoadState<GameDetails>,
  reload: () => void,
): GameDetailsState {
  switch (state.status) {
    case 'loading': {
      return { status: 'loading', slug };
    }
    case 'success': {
      return { status: 'success', slug, game: state.data[0] };
    }
    case 'empty': {
      return { status: 'error', slug, message: FALLBACK_ERROR_MESSAGE, retry: reload };
    }
    case 'error': {
      return { status: 'error', slug, message: state.message, retry: state.retry };
    }
  }
}

/**
 * Loads `GET /api/games/{slug}` whenever the dialog's `?game=` slug changes. An unknown slug (404)
 * closes the dialog with an error snackbar instead of showing a banner for a game that doesn't exist.
 */
export function useGameDetails(): GameDetailsController {
  let state: GameDetailsState = { status: 'idle' };
  let loader: LoadStateController<GameDetails> | undefined;
  let unsubscribeLoader: (() => void) | undefined;
  const listeners = new Set<(state: GameDetailsState) => void>();

  function setState(next: GameDetailsState): void {
    state = next;

    for (const listener of listeners) {
      listener(state);
    }
  }

  function stopLoader(): void {
    unsubscribeLoader?.();
    loader?.destroy();
    unsubscribeLoader = undefined;
    loader = undefined;
  }

  function start(slug: string | undefined): void {
    stopLoader();

    if (slug === undefined) {
      setState({ status: 'idle' });
      return;
    }

    let isMissing = false;

    const current = useLoadState<GameDetails>({
      async load(signal) {
        try {
          const { data } = await gamesApi.fetchGameDetails(slug, { signal });
          return { items: [data] };
        } catch (error) {
          if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) {
            isMissing = true;
            showSnackbar({ variant: 'error', message: NOT_FOUND_MESSAGE });
            closeGameDetailsDialog();
          }
          throw error;
        }
      },
      fallbackErrorMessage: FALLBACK_ERROR_MESSAGE,
      retrySuccessMessage: RETRY_SUCCESS_MESSAGE,
    });

    loader = current;
    unsubscribeLoader = current.subscribe((loadState) => {
      if (!isMissing) {
        setState(toGameDetailsState(slug, loadState, current.reload));
      }
    });
    setState(toGameDetailsState(slug, current.getState(), current.reload));
  }

  const unsubscribeDialog = subscribeGameDetailsDialog(({ slug }) => {
    start(slug);
  });
  start(getGameDetailsDialogState().slug);

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    destroy() {
      unsubscribeDialog();
      stopLoader();
      listeners.clear();
    },
  };
}
