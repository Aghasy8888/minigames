import { isAbortError, toUserFacingMessage } from '../services/games-api-provider';
import { showSnackbar } from '../store/snackbar-store';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T[] }
  | { status: 'empty' }
  | { status: 'error'; message: string; retry: () => void };

export type LoadStateController<T> = {
  getState: () => LoadState<T>;
  subscribe: (listener: (state: LoadState<T>) => void) => () => void;
  destroy: () => void;
};

export type UseLoadStateOptions<T> = {
  load: (signal: AbortSignal) => Promise<readonly T[]>;
  fallbackErrorMessage: string;
  retrySuccessMessage: string;
};

/** Snackbar feedback is reserved for Retry outcomes; an empty result never triggers one. */
export function useLoadState<T>({
  load,
  fallbackErrorMessage,
  retrySuccessMessage,
}: UseLoadStateOptions<T>): LoadStateController<T> {
  let state: LoadState<T> = { status: 'loading' };
  let requestId = 0;
  let controller: AbortController | undefined;
  let isDestroyed = false;
  const listeners = new Set<(state: LoadState<T>) => void>();

  function setState(next: LoadState<T>): void {
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

  async function run({ fromRetry }: { fromRetry: boolean }): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const currentId = ++requestId;
    const { signal } = controller;

    setState({ status: 'loading' });

    try {
      const data = await load(signal);

      if (isDestroyed || currentId !== requestId) {
        return;
      }

      if (data.length === 0) {
        setState({ status: 'empty' });
        return;
      }

      setState({ status: 'success', data: [...data] });

      if (fromRetry) {
        showSnackbar({ variant: 'success', message: retrySuccessMessage });
      }
    } catch (error) {
      if (isDestroyed || currentId !== requestId || isAbortError(error)) {
        return;
      }

      const message = toUserFacingMessage(error, fallbackErrorMessage);
      setState({ status: 'error', message, retry });

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
    destroy() {
      isDestroyed = true;
      controller?.abort();
      listeners.clear();
    },
  };
}
