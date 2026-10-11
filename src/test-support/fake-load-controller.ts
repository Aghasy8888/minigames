import { vi, type Mock } from 'vitest';

import type { LoadState, LoadStateController } from '../hooks/use-load-state';

export type FakeLoadController<T, TMeta = undefined> = LoadStateController<T, TMeta> & {
  reload: Mock<() => void>;
  emit: (state: LoadState<T, TMeta>) => void;
};

/** Stands in for a `useLoadState` controller; tests push states with `emit`. */
export function fakeLoadController<T, TMeta = undefined>(
  initial: LoadState<T, TMeta>,
): FakeLoadController<T, TMeta> {
  let state = initial;
  const listeners = new Set<(next: LoadState<T, TMeta>) => void>();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload: vi.fn<() => void>(),
    destroy: vi.fn<() => void>(),
    emit(next) {
      state = next;
      for (const listener of listeners) {
        listener(next);
      }
    },
  };
}
