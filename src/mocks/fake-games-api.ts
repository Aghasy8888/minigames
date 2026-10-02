import { ApiError } from '../services/api-client';
import type { GamesApi, GamesListResponse } from '../services/games-api';
import type { GamesListMeta } from '../services/games-types';
import type { LeaderboardResponse } from '../services/leaderboard-api';
import type { LeaderboardMeta } from '../services/leaderboard-types';
import featuredGamesFixture from './featured-games.json';
import leaderboardFixture from './leaderboard.json';

export type FakeGamesScenario = 'success' | 'empty' | '401' | '404' | '429';

type ErrorScenario = Exclude<FakeGamesScenario, 'success' | 'empty'>;

type EndpointFake<TResponse> = {
  success: TResponse;
  empty: TResponse;
  errors: Record<ErrorScenario, string>;
};

const FAKE_DELAY_MS = 400;

const FEATURED_EMPTY_META: GamesListMeta = {
  page: 1,
  limit: 9,
  totalItems: 0,
  totalPages: 0,
  appliedFilter: { featured: true },
};

const LEADERBOARD_EMPTY_META: LeaderboardMeta = {
  totalItems: 0,
  description: 'Top Players This Week',
};

const RATE_LIMIT_MESSAGE = 'Rate limit exceeded. Try again in 42 seconds';

/** 401/404 are not in the spec for list endpoints; they exercise the section fallback copy. */
const GAMES_LIST_FAKE: EndpointFake<GamesListResponse> = {
  success: featuredGamesFixture as GamesListResponse,
  empty: { data: [], meta: FEATURED_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Games not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

const LEADERBOARD_FAKE: EndpointFake<LeaderboardResponse> = {
  success: leaderboardFixture as LeaderboardResponse,
  empty: { data: [], meta: LEADERBOARD_EMPTY_META },
  errors: {
    '401': 'Authentication required',
    '404': 'Leaderboard not found',
    '429': RATE_LIMIT_MESSAGE,
  },
};

function createAbortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

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

async function respond<TResponse>(
  scenario: FakeGamesScenario,
  endpoint: EndpointFake<TResponse>,
  signal?: AbortSignal,
): Promise<TResponse> {
  await wait(FAKE_DELAY_MS, signal);

  if (scenario === 'success' || scenario === 'empty') {
    return endpoint[scenario];
  }

  throw new ApiError(endpoint.errors[scenario], Number(scenario));
}

export function createFakeGamesApi(scenario: FakeGamesScenario): GamesApi {
  return {
    fetchGames(_parameters, options = {}) {
      return respond(scenario, GAMES_LIST_FAKE, options.signal);
    },
    fetchFeaturedGames(options = {}) {
      return respond(scenario, GAMES_LIST_FAKE, options.signal);
    },
    fetchLeaderboard(options = {}) {
      return respond(scenario, LEADERBOARD_FAKE, options.signal);
    },
  };
}
