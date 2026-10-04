import { isAbortError, toUserFacingMessage } from '../services/games-api-provider';
import { showSnackbar } from '../store/snackbar-store';

export type LoadResult<T, TMeta = undefined> = {
  items: readonly T[];
  meta?: TMeta;
};

export const LOAD_STATUS = {
  loading: 'loading',
  success: 'success',
  empty: 'empty',
  error: 'error',
} as const;

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

export type LoadState<T, TMeta = undefined> =
  | { status: typeof loading }
  | { status: typeof success; data: T[]; meta?: TMeta }
  | { status: typeof empty; meta?: TMeta }
  | { status: typeof errorStatus; message: string; retry: () => void };

export type LoadStateController<T, TMeta = undefined> = {
  getState: () => LoadState<T, TMeta>;
  subscribe: (listener: (state: LoadState<T, TMeta>) => void) => () => void;
  reload: () => void;
  destroy: () => void;
};

export type UseLoadStateOptions<T, TMeta = undefined> = {
  load: (signal: AbortSignal) => Promise<LoadResult<T, TMeta>>;
  fallbackErrorMessage: string;
  retrySuccessMessage: string;
};

/** Snackbar feedback is reserved for Retry outcomes; an empty result never triggers one. */
export function useLoadState<T, TMeta = undefined>({
  load,
  fallbackErrorMessage,
  retrySuccessMessage,
}: UseLoadStateOptions<T, TMeta>): LoadStateController<T, TMeta> {
  let state: LoadState<T, TMeta> = { status: loading };
  let requestId = 0;
  let controller: AbortController | undefined;
  let isDestroyed = false;
  const listeners = new Set<(state: LoadState<T, TMeta>) => void>();

  function setState(next: LoadState<T, TMeta>): void {
    if (isDestroyed) {
      return;
    }

    state = next;

    for (const listener of listeners) {
      listener(state);
    }
  }

  function retry(): void {
    void run({ fromRetry: true });
  }

  function reload(): void {
    void run({ fromRetry: false });
  }

  async function run({ fromRetry }: { fromRetry: boolean }): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const currentId = ++requestId;
    const { signal } = controller;

    setState({ status: loading });

    try {
      const { items, meta } = await load(signal);

      if (isDestroyed || currentId !== requestId) {
        return;
      }

      if (items.length === 0) {
        setState({ status: empty, meta });
        return;
      }

      setState({ status: success, data: [...items], meta });

      if (fromRetry) {
        showSnackbar({ variant: 'success', message: retrySuccessMessage });
      }
    } catch (error) {
      if (isDestroyed || currentId !== requestId || isAbortError(error)) {
        return;
      }

      const message = toUserFacingMessage(error, fallbackErrorMessage);
      setState({ status: errorStatus, message, retry });

      if (fromRetry) {
        showSnackbar({ variant: 'error', message });
      }
    }
  }

  void run({ fromRetry: false });

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
    reload,
    destroy() {
      isDestroyed = true;
      controller?.abort();
      listeners.clear();
    },
  };
}
