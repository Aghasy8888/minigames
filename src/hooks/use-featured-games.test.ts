import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeGame, makeGamesMeta } from '../test-support/api-factories';
import {
  jsonResponse,
  sentRequest,
  stubFetchJson,
  stubPendingFetch,
} from '../test-support/fetch-stub';
import type { FeaturedGamesController, FeaturedGamesState } from './use-featured-games';
import { LOAD_STATUS } from './use-load-state';

const { success, empty, error: errorStatus } = LOAD_STATUS;

const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';
const FALLBACK_MESSAGE = 'New games are unavailable right now. Please try again.';

let hook: typeof import('./use-featured-games');
let snackbars: typeof import('../store/snackbar-store');
const controllers: FeaturedGamesController[] = [];

function createFeatured(): FeaturedGamesController {
  const controller = hook.useFeaturedGames();
  controllers.push(controller);
  return controller;
}

async function waitForStatus(
  controller: FeaturedGamesController,
  status: FeaturedGamesState['status'],
): Promise<void> {
  await vi.waitFor(() => expect(controller.getState().status).toBe(status));
}

beforeEach(async () => {
  vi.stubEnv('VITE_API_MOCK', '');
  vi.resetModules();
  snackbars = await import('../store/snackbar-store');
  hook = await import('./use-featured-games');
});

afterEach(() => {
  for (const controller of controllers.splice(0)) {
    controller.destroy();
  }
});

describe('useFeaturedGames', () => {
  it('requests only the featured games', async () => {
    const data = [makeGame(), makeGame({ slug: 'snake' })];
    const fetchMock = stubFetchJson({ data, meta: makeGamesMeta() });

    const featured = createFeatured();
    await waitForStatus(featured, success);

    const { url, method } = sentRequest(fetchMock);
    expect(method).toBe('GET');
    expect(url.href).toBe(`${API_BASE_URL}/api/games?featured=true`);
    expect(featured.getState()).toStrictEqual({ status: success, data, meta: undefined });
  });

  it('aborts the pending request on destroy', () => {
    const { fetchMock } = stubPendingFetch();

    createFeatured().destroy();

    expect(sentRequest(fetchMock).signal?.aborted).toBe(true);
  });

  it('shows the empty state when nothing is featured', async () => {
    stubFetchJson({ data: [], meta: makeGamesMeta({ totalItems: 0, totalPages: 0 }) });

    await waitForStatus(createFeatured(), empty);
  });

  it.each([
    { name: 'a 500', status: 500, error: 'Internal error', message: FALLBACK_MESSAGE },
    {
      name: 'a 429',
      status: 429,
      error: 'Too many requests, please try again later.',
      message: 'Too many requests, please try again later.',
    },
  ])('shows a readable error for $name', async ({ status, error, message }) => {
    stubFetchJson({ error }, status);

    const featured = createFeatured();
    await waitForStatus(featured, errorStatus);

    expect(featured.getState()).toMatchObject({ status: errorStatus, message });
  });

  it('confirms a successful Retry with a Snackbar', async () => {
    const fetchMock = stubFetchJson({ error: 'Internal error' }, 500);
    const featured = createFeatured();
    await waitForStatus(featured, errorStatus);
    const state = featured.getState();

    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ data: [makeGame()], meta: makeGamesMeta() })),
    );
    if (state.status === errorStatus) {
      state.retry();
    }
    await waitForStatus(featured, success);

    expect(
      snackbars.getSnackbars().map(({ variant, message }) => ({ variant, message })),
    ).toStrictEqual([{ variant: 'success', message: 'New games loaded' }]);
  });
});
