import {
  ApiError,
  gamesApi,
  isAbortError,
  type GameListItem,
} from '../services/games-api-provider';
import { showSnackbar } from '../store/snackbar-store';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T[] }
  | { status: 'empty' }
  | { status: 'error'; message: string; retry: () => void };

export type FeaturedGamesState = LoadState<GameListItem>;

export type FeaturedGamesController = {
  getState: () => FeaturedGamesState;
  subscribe: (listener: (state: FeaturedGamesState) => void) => () => void;
  destroy: () => void;
};

const FALLBACK_ERROR_MESSAGE = 'Could not load new games. Try again.';
const RETRY_SUCCESS_MESSAGE = 'New games loaded';

type FeaturedGamesListener = (state: FeaturedGamesState) => void;

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.message.trim();
    return message === '' ? FALLBACK_ERROR_MESSAGE : message;
  }

  return FALLBACK_ERROR_MESSAGE;
}

export function useFeaturedGames(): FeaturedGamesController {
  let state: FeaturedGamesState = { status: 'loading' };
  let requestId = 0;
  let controller: AbortController | undefined;
  let isDestroyed = false;
  const listeners = new Set<FeaturedGamesListener>();

  function notify(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function setState(next: FeaturedGamesState): void {
    if (isDestroyed) {
      return;
    }

    state = next;
    notify();
  }

  function retry(): void {
    void load({ fromRetry: true });
  }

  function toErrorState(error: unknown): Extract<FeaturedGamesState, { status: 'error' }> {
    if (error instanceof ApiError && error.status === 429) {
      return {
        status: 'error',
        message: toErrorMessage(error),
        retry,
      };
    }

    return {
      status: 'error',
      message: toErrorMessage(error),
      retry,
    };
  }

  async function load({ fromRetry }: { fromRetry: boolean }): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const currentId = ++requestId;
    const { signal } = controller;

    setState({ status: 'loading' });

    try {
      const { data } = await gamesApi.fetchFeaturedGames({ signal });

      if (isDestroyed || currentId !== requestId) {
        return;
      }

      if (data.length === 0) {
        setState({ status: 'empty' });

        if (fromRetry) {
          showSnackbar({ variant: 'success', message: RETRY_SUCCESS_MESSAGE });
        }

        return;
      }

      setState({ status: 'success', data });

      if (fromRetry) {
        showSnackbar({ variant: 'success', message: RETRY_SUCCESS_MESSAGE });
      }
    } catch (error) {
      if (isDestroyed || currentId !== requestId || isAbortError(error)) {
        return;
      }

      const nextState = toErrorState(error);
      setState(nextState);

      if (fromRetry) {
        showSnackbar({ variant: 'error', message: nextState.message });
      }
    }
  }

  void load({ fromRetry: false });

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
      isDestroyed = true;
      controller?.abort();
      listeners.clear();
    },
  };
}
