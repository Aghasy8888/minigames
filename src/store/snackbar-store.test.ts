import { beforeEach, describe, expect, it, vi } from 'vitest';

type SnackbarStore = typeof import('./snackbar-store');

let store: SnackbarStore;

function shownMessages(): string[] {
  return store.getSnackbars().map(({ message }) => message);
}

beforeEach(async () => {
  vi.resetModules();
  store = await import('./snackbar-store');
});

describe('showSnackbar', () => {
  it('adds the snackbar with a fresh id and returns that id', () => {
    const first = store.showSnackbar({ variant: 'success', message: 'Saved' });
    const second = store.showSnackbar({ variant: 'info', message: 'Heads up' });

    expect(first).not.toBe(second);
    expect(store.getSnackbars()).toStrictEqual([
      { id: first, variant: 'success', message: 'Saved', durationMs: 5000 },
      { id: second, variant: 'info', message: 'Heads up', durationMs: 5000 },
    ]);
  });

  it.each([
    { variant: 'success' as const, durationMs: 5000 },
    { variant: 'info' as const, durationMs: 5000 },
    { variant: 'warning' as const, durationMs: 5000 },
    { variant: 'error' as const, durationMs: 7000 },
  ])('gives a $variant snackbar $durationMs ms by default', ({ variant, durationMs }) => {
    store.showSnackbar({ variant, message: 'Message' });

    expect(store.getSnackbars()[0]?.durationMs).toBe(durationMs);
  });

  it('keeps an explicit duration', () => {
    store.showSnackbar({ variant: 'error', message: 'Message', durationMs: 1200 });

    expect(store.getSnackbars()[0]?.durationMs).toBe(1200);
  });

  it('caps the stack at three, dropping the oldest', () => {
    for (const message of ['one', 'two', 'three', 'four']) {
      store.showSnackbar({ variant: 'info', message });
    }

    expect(shownMessages()).toStrictEqual(['two', 'three', 'four']);
  });

  it('notifies subscribers with the new list', () => {
    const listener = vi.fn();
    store.subscribeSnackbars(listener);

    store.showSnackbar({ variant: 'warning', message: 'Careful' });

    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({ variant: 'warning', message: 'Careful' }),
    ]);
  });
});

describe('dismissSnackbar', () => {
  it('removes only the snackbar with that id and notifies', () => {
    const first = store.showSnackbar({ variant: 'info', message: 'one' });
    store.showSnackbar({ variant: 'info', message: 'two' });
    const listener = vi.fn();
    store.subscribeSnackbars(listener);

    store.dismissSnackbar(first);

    expect(shownMessages()).toStrictEqual(['two']);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does nothing for an unknown id', () => {
    store.showSnackbar({ variant: 'info', message: 'one' });
    const listener = vi.fn();
    store.subscribeSnackbars(listener);

    store.dismissSnackbar('missing');

    expect(shownMessages()).toStrictEqual(['one']);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('subscribeSnackbars', () => {
  it('calls the listener with the current list right away', () => {
    store.showSnackbar({ variant: 'info', message: 'one' });
    const listener = vi.fn();

    store.subscribeSnackbars(listener);

    expect(listener).toHaveBeenCalledExactlyOnceWith(store.getSnackbars());
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeSnackbars(listener);

    unsubscribe();
    store.showSnackbar({ variant: 'info', message: 'one' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
