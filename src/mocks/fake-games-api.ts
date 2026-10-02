import { ApiError } from '../services/api-client';
import type { GamesApi, GamesListResponse } from '../services/games-api';
import type { GamesListMeta } from '../services/games-types';
import featuredGamesFixture from './featured-games.json';

export type FakeGamesScenario = 'success' | 'empty' | '401' | '404' | '429';

const FAKE_DELAY_MS = 400;

const FEATURED_SUCCESS = featuredGamesFixture as GamesListResponse;

const EMPTY_META: GamesListMeta = {
  page: 1,
  limit: 9,
  totalItems: 0,
  totalPages: 0,
  appliedFilter: { featured: true },
};

const ERROR_BY_SCENARIO: Record<
  Exclude<FakeGamesScenario, 'success' | 'empty'>,
  { status: number; message: string }
> = {
  '401': { status: 401, message: 'Authentication required: userEmail is missing' },
  '404': { status: 404, message: 'Game not found: invalid-slug' },
  '429': { status: 429, message: 'Rate limit exceeded. Try again in 42 seconds' },
};

function wait(durationMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, durationMs);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(createAbortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function createAbortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

async function respond(
  scenario: FakeGamesScenario,
  signal?: AbortSignal,
): Promise<GamesListResponse> {
  await wait(FAKE_DELAY_MS, signal);

  if (scenario === 'success') {
    return {
      data: FEATURED_SUCCESS.data,
      meta: FEATURED_SUCCESS.meta,
    };
  }

  if (scenario === 'empty') {
    return {
      data: [],
      meta: EMPTY_META,
    };
  }

  const error = ERROR_BY_SCENARIO[scenario];
  throw new ApiError(error.message, error.status);
}

export function createFakeGamesApi(scenario: FakeGamesScenario): GamesApi {
  return {
    fetchGames(_parameters, options = {}) {
      return respond(scenario, options.signal);
    },
    fetchFeaturedGames(options = {}) {
      return respond(scenario, options.signal);
    },
  };
}
