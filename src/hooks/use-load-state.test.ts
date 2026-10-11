import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { deferred, type Deferred } from '../test-support/deferred';
import { LOAD_STATUS, type LoadResult, type LoadStateController } from './use-load-state';

const { loading, success, empty, error: errorStatus } = LOAD_STATUS;

type Item = { id: number };
type Meta = { total: number };
type LoadFunction = (signal: AbortSignal) => Promise<LoadResult<Item, Meta>>;

const FALLBACK_MESSAGE = 'Top players are unavailable right now. Please try again.';
const RETRY_SUCCESS_MESSAGE = 'Top players loaded';
const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

let hook: typeof import('./use-load-state');
let api: typeof import('../services/api-client');
let snackbars: typeof import('../store/snackbar-store');
const controllers: LoadStateController<Item, Meta>[] = [];

/** Each call to the returned `load` gets its own deferred result, in call order. */
function deferredLoads(): {
  load: Mock<LoadFunction>;
  results: Deferred<LoadResult<Item, Meta>>[];
} {
  const results: Deferred<LoadResult<Item, Meta>>[] = [];
  const load = vi.fn<LoadFunction>(() => {
    const result = deferred<LoadResult<Item, Meta>>();
    results.push(result);
    return result.promise;
  });
  return { load, results };
}

function createLoader(load: LoadFunction): LoadStateController<Item, Meta> {
  const controller = hook.useLoadState<Item, Meta>({
    load,
    fallbackErrorMessage: FALLBACK_MESSAGE,
    retrySuccessMessage: RETRY_SUCCESS_MESSAGE,
  });
  controllers.push(controller);
  return controller;
}

function shownSnackbars(): { variant: string; message: string }[] {
  return snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message }));
}

/** Lets the hook react to a settled `load` promise. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

/** A loader whose first request failed, plus the Retry from its error state. */
async function failedLoader(): Promise<{
  loader: LoadStateController<Item, Meta>;
  load: Mock<LoadFunction>;
  results: Deferred<LoadResult<Item, Meta>>[];
  retry: () => void;
}> {
  const { load, results } = deferredLoads();
  const loader = createLoader(load);
  results[0]?.reject(new Error('boom'));
  await settle();
  const state = loader.getState();
  if (state.status !== errorStatus) {
    throw new Error('expected the error state');
  }
  return { loader, load, results, retry: state.retry };
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  hook = await import('./use-load-state');
  api = await import('../services/api-client');
  snackbars = await import('../store/snackbar-store');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
  vi.useRealTimers();
});

describe('useLoadState', () => {
  it('starts loading right away with one request', () => {
    const { load } = deferredLoads();

    const loader = createLoader(load);

    expect(loader.getState()).toStrictEqual({ status: loading });
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
  });

  it('shows the returned items and meta on success, with no Snackbar', async () => {
    const { load, results } = deferredLoads();
    const loader = createLoader(load);

    results[0]?.resolve({ items: [{ id: 1 }, { id: 2 }], meta: { total: 2 } });
    await settle();

    expect(loader.getState()).toStrictEqual({
      status: success,
      data: [{ id: 1 }, { id: 2 }],
      meta: { total: 2 },
    });
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('treats a successful response with no items as empty, not an error', async () => {
    const { load, results } = deferredLoads();
    const loader = createLoader(load);

    results[0]?.resolve({ items: [], meta: { total: 0 } });
    await settle();

    expect(loader.getState()).toStrictEqual({ status: empty, meta: { total: 0 } });
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it.each([
    {
      name: 'a 400 with technical text',
      error: () => new api.ApiError('Invalid sort', 400),
      message: FALLBACK_MESSAGE,
    },
    {
      name: 'a 404',
      error: () => new api.ApiError('Game not found: x', 404),
      message: FALLBACK_MESSAGE,
    },
    { name: 'a non-API error', error: () => new Error('boom'), message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      error: () => new api.ApiError('Too many requests, please try again later.', 429),
      message: 'Too many requests, please try again later.',
    },
    {
      name: 'a network failure',
      error: () => new api.ApiError(NETWORK_MESSAGE, api.NETWORK_ERROR_STATUS),
      message: NETWORK_MESSAGE,
    },
  ])('shows the error state for $name without a Snackbar', async ({ error, message }) => {
    const { load, results } = deferredLoads();
    const loader = createLoader(load);

    results[0]?.reject(error());
    await settle();

    expect(loader.getState()).toStrictEqual({
      status: errorStatus,
      message,
      retry: expect.any(Function),
    });
    expect(shownSnackbars()).toStrictEqual([]);
  });

  it('never retries on its own after a failure', async () => {
    const { load, results } = deferredLoads();
    createLoader(load);

    results[0]?.reject(new api.ApiError('Too many requests, please try again later.', 429));
    await settle();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(load).toHaveBeenCalledTimes(1);
  });

  describe('retry', () => {
    it('re-sends the request and shows the skeleton again', async () => {
      const { loader, load, retry } = await failedLoader();

      retry();

      expect(load).toHaveBeenCalledTimes(2);
      expect(loader.getState()).toStrictEqual({ status: loading });
    });

    it('confirms a successful retry with one success Snackbar', async () => {
      const { loader, results, retry } = await failedLoader();

      retry();
      results[1]?.resolve({ items: [{ id: 1 }] });
      await settle();

      expect(loader.getState()).toMatchObject({ status: success, data: [{ id: 1 }] });
      expect(shownSnackbars()).toStrictEqual([
        { variant: 'success', message: RETRY_SUCCESS_MESSAGE },
      ]);
    });

    it('reports a failed retry with the banner message in one error Snackbar', async () => {
      const { loader, results, retry } = await failedLoader();

      retry();
      results[1]?.reject(new Error('still down'));
      await settle();

      expect(loader.getState()).toMatchObject({ status: errorStatus, message: FALLBACK_MESSAGE });
      expect(shownSnackbars()).toStrictEqual([{ variant: 'error', message: FALLBACK_MESSAGE }]);
    });

    it('shows no Snackbar when a retry comes back empty', async () => {
      const { loader, results, retry } = await failedLoader();

      retry();
      results[1]?.resolve({ items: [] });
      await settle();

      expect(loader.getState()).toStrictEqual({ status: empty, meta: undefined });
      expect(shownSnackbars()).toStrictEqual([]);
    });
  });

  describe('reload', () => {
    it('goes back to loading and aborts the request it replaces', () => {
      const { load } = deferredLoads();
      const loader = createLoader(load);
      const firstSignal = load.mock.calls[0]?.[0];

      loader.reload();

      expect(firstSignal?.aborted).toBe(true);
      expect(load.mock.calls[1]?.[0].aborted).toBe(false);
      expect(loader.getState()).toStrictEqual({ status: loading });
    });

    it('ignores a stale success that arrives after a newer request', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);
      loader.reload();

      results[1]?.resolve({ items: [{ id: 2 }] });
      await settle();
      results[0]?.resolve({ items: [{ id: 1 }] });
      await settle();

      expect(loader.getState()).toMatchObject({ status: success, data: [{ id: 2 }] });
    });

    it('ignores a stale failure that arrives after a newer request', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);
      loader.reload();

      results[1]?.resolve({ items: [{ id: 2 }] });
      await settle();
      results[0]?.reject(new Error('late failure'));
      await settle();

      expect(loader.getState()).toMatchObject({ status: success, data: [{ id: 2 }] });
    });

    it('stays loading when the current request is aborted', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);

      results[0]?.reject(new DOMException('The operation was aborted.', 'AbortError'));
      await settle();

      expect(loader.getState()).toStrictEqual({ status: loading });
    });

    it('shows no Snackbar for a reload that succeeds', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);
      loader.reload();

      results[1]?.resolve({ items: [{ id: 1 }] });
      await settle();

      expect(shownSnackbars()).toStrictEqual([]);
    });
  });

  describe('subscribe and destroy', () => {
    it('notifies each state change until unsubscribed', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);
      const listener = vi.fn();
      const unsubscribe = loader.subscribe(listener);

      loader.reload();
      results[1]?.resolve({ items: [{ id: 1 }] });
      await settle();
      unsubscribe();
      loader.reload();

      expect(listener.mock.calls).toStrictEqual([
        [{ status: loading }],
        [{ status: success, data: [{ id: 1 }], meta: undefined }],
      ]);
    });

    it('aborts the request on destroy and ignores its late result', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);
      const listener = vi.fn();
      loader.subscribe(listener);

      loader.destroy();
      results[0]?.resolve({ items: [{ id: 1 }] });
      await settle();

      expect(load.mock.calls[0]?.[0].aborted).toBe(true);
      expect(loader.getState()).toStrictEqual({ status: loading });
      expect(listener).not.toHaveBeenCalled();
    });

    it('ignores a late failure after destroy', async () => {
      const { load, results } = deferredLoads();
      const loader = createLoader(load);

      loader.destroy();
      results[0]?.reject(new Error('boom'));
      await settle();

      expect(loader.getState()).toStrictEqual({ status: loading });
    });
  });
});
