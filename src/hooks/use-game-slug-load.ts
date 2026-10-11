import {
  getGameDetailsDialogState,
  subscribeGameDetailsDialog,
} from '../store/game-details-dialog-store';
import { getUserEmail, subscribeSession } from '../store/session-store';
import {
  useLoadState,
  type LoadResult,
  type LoadState,
  type LoadStateController,
} from './use-load-state';

export const GAME_SLUG_LOAD_STATUS = {
  idle: 'idle',
  active: 'active',
} as const;

const { idle, active } = GAME_SLUG_LOAD_STATUS;

export type GameSlugLoadState<T, TMeta = undefined> =
  | { status: typeof idle }
  | {
      status: typeof active;
      slug: string;
      reload: () => void;
      load: LoadState<T, TMeta>;
    };

export type GameSlugLoadController<T, TMeta = undefined> = {
  getState: () => GameSlugLoadState<T, TMeta>;
  subscribe: (listener: (state: GameSlugLoadState<T, TMeta>) => void) => () => void;
  /** Refetches the open slug (loading → result); no-op while idle. */
  reload: () => void;
  destroy: () => void;
};

export type GameSlugLoadContext = {
  signal: AbortSignal;
  /** Active session email; undefined for a guest. */
  userEmail?: string;
};

export type UseGameSlugLoadOptions<T, TMeta = undefined> = {
  load: (slug: string, context: GameSlugLoadContext) => Promise<LoadResult<T, TMeta>>;
  fallbackErrorMessage: string;
  retrySuccessMessage: string;
};

/**
 * Runs one `useLoadState` per Game Details `?game=` slug and session email: a new slug, login, or
 * logout aborts and replaces the previous request, and closing the dialog returns to `idle`.
 */
export function useGameSlugLoad<T, TMeta = undefined>({
  load,
  fallbackErrorMessage,
  retrySuccessMessage,
}: UseGameSlugLoadOptions<T, TMeta>): GameSlugLoadController<T, TMeta> {
  let state: GameSlugLoadState<T, TMeta> = { status: idle };
  let loader: LoadStateController<T, TMeta> | undefined;
  let unsubscribeLoader: (() => void) | undefined;
  let currentSlug: string | undefined;
  let currentEmail = getUserEmail();
  const listeners = new Set<(state: GameSlugLoadState<T, TMeta>) => void>();

  function setState(next: GameSlugLoadState<T, TMeta>): void {
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
    currentSlug = slug;

    if (slug === undefined) {
      setState({ status: idle });
      return;
    }

    const userEmail = currentEmail;
    const current = useLoadState<T, TMeta>({
      load: (signal) => load(slug, { signal, userEmail }),
      fallbackErrorMessage,
      retrySuccessMessage,
    });

    loader = current;
    const { reload, subscribe, getState } = current;
    const toState = (loadState: LoadState<T, TMeta>): GameSlugLoadState<T, TMeta> => ({
      status: active,
      slug,
      reload,
      load: loadState,
    });

    unsubscribeLoader = subscribe((loadState) => {
      setState(toState(loadState));
    });
    setState(toState(getState()));
  }

  const unsubscribeDialog = subscribeGameDetailsDialog(({ slug }) => {
    start(slug);
  });

  const unsubscribeSession = subscribeSession(() => {
    const nextEmail = getUserEmail();

    if (nextEmail === currentEmail) {
      return;
    }

    currentEmail = nextEmail;

    if (currentSlug !== undefined) {
      start(currentSlug);
    }
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
    reload() {
      loader?.reload();
    },
    destroy() {
      unsubscribeDialog();
      unsubscribeSession();
      stopLoader();
      listeners.clear();
    },
  };
}
