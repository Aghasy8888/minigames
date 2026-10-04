import { ApiError, gamesApi, type GameDetails } from '../services/games-api-provider';
import { closeGameDetailsDialog } from '../store/game-details-dialog-store';
import { showSnackbar } from '../store/snackbar-store';
import {
  GAME_SLUG_LOAD_STATUS,
  useGameSlugLoad,
  type GameSlugLoadState,
} from './use-game-slug-load';
import { LOAD_STATUS } from './use-load-state';

const { idle, active } = GAME_SLUG_LOAD_STATUS;
const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

const FALLBACK_ERROR_MESSAGE = 'Game details are unavailable right now. Please try again.';
const RETRY_SUCCESS_MESSAGE = 'Game details loaded';
const NOT_FOUND_MESSAGE = 'This game could not be found.';
const NOT_FOUND_STATUS = 404;

export type GameDetailsState =
  | { status: typeof idle }
  | { status: typeof loading; slug: string }
  | { status: typeof success; slug: string; game: GameDetails }
  | { status: typeof errorStatus; slug: string; message: string; retry: () => void };

export type GameDetailsController = {
  getState: () => GameDetailsState;
  subscribe: (listener: (state: GameDetailsState) => void) => () => void;
  destroy: () => void;
};

function toGameDetailsState(state: GameSlugLoadState<GameDetails>): GameDetailsState {
  if (state.status === idle) {
    return state;
  }

  const { slug, load, reload } = state;

  switch (load.status) {
    case loading: {
      return { status: loading, slug };
    }
    case success: {
      const [game] = load.data;
      return { status: success, slug, game };
    }
    case empty: {
      return { status: errorStatus, slug, message: FALLBACK_ERROR_MESSAGE, retry: reload };
    }
    case errorStatus: {
      const { message, retry } = load;
      return { status: errorStatus, slug, message, retry };
    }
  }
}

/**
 * Loads `GET /api/games/{slug}` whenever the dialog's `?game=` slug changes. An unknown slug (404)
 * closes the dialog with an error snackbar instead of showing a banner for a game that doesn't exist.
 */
export function useGameDetails(): GameDetailsController {
  let missingSlug: string | undefined;
  const listeners = new Set<(state: GameDetailsState) => void>();

  const slugLoad = useGameSlugLoad<GameDetails>({
    async load(slug, signal) {
      missingSlug = undefined;

      try {
        const { data } = await gamesApi.fetchGameDetails(slug, { signal });
        return { items: [data] };
      } catch (error) {
        if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) {
          missingSlug = slug;
          showSnackbar({ variant: 'error', message: NOT_FOUND_MESSAGE });
          closeGameDetailsDialog();
        }
        throw error;
      }
    },
    fallbackErrorMessage: FALLBACK_ERROR_MESSAGE,
    retrySuccessMessage: RETRY_SUCCESS_MESSAGE,
  });

  let state = toGameDetailsState(slugLoad.getState());

  const unsubscribe = slugLoad.subscribe((slugState) => {
    const isMissingGameError =
      slugState.status === active &&
      slugState.slug === missingSlug &&
      slugState.load.status === errorStatus;

    if (isMissingGameError) {
      return;
    }

    state = toGameDetailsState(slugState);

    for (const listener of listeners) {
      listener(state);
    }
  });

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
      unsubscribe();
      slugLoad.destroy();
      listeners.clear();
    },
  };
}
