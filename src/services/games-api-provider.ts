import { createFakeGamesApi, type FakeGamesScenario } from '../mocks/fake-games-api';
import { fetchFeaturedGames, fetchGames, type GamesApi } from './games-api';

export { ApiError, isAbortError } from './api-client';
export type { GamesApi, GamesListResponse, GamesRequestOptions } from './games-api';
export type {
  GameCategory,
  GameListItem,
  GameSort,
  GamesListMeta,
  GamesListParameters,
} from './games-types';

const MOCK_SCENARIOS = new Set<string>(['success', 'empty', '401', '404', '429']);

function isMockScenario(value: string | undefined): value is FakeGamesScenario {
  return value !== undefined && MOCK_SCENARIOS.has(value);
}

const mockScenario = import.meta.env.VITE_API_MOCK;

export const gamesApi: GamesApi = isMockScenario(mockScenario)
  ? createFakeGamesApi(mockScenario)
  : { fetchGames, fetchFeaturedGames };
