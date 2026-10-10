import { createFakeGamesApi, type FakeGamesScenario } from '../mocks/fake-games-api';
import { fetchCategories } from './categories-api';
import { fetchGameComments } from './comments-api';
import { toggleFavorite } from './favorite-api';
import { fetchGameDetails } from './game-details-api';
import { fetchFeaturedGames, fetchGames, type GamesApi } from './games-api';
import { fetchLeaderboard } from './leaderboard-api';

export { ApiError, NETWORK_ERROR_STATUS, isAbortError } from './api-client';
export { toUserFacingMessage } from './api-error-message';
export type { CategoriesRequestOptions, CategoriesResponse } from './categories-api';
export type { CategoriesMeta, CategoryItem } from './categories-types';
export type { GameCommentsRequestOptions, GameCommentsResponse } from './comments-api';
export type { GameComment, GameCommentsMeta, GameCommentsSort } from './comments-types';
export type { FavoriteToggleOptions, FavoriteToggleResponse } from './favorite-api';
export type { FavoriteToggleResult } from './favorite-types';
export type { GameDetailsRequestOptions, GameDetailsResponse } from './game-details-api';
export type { GameDetails, GameDetailsSpecs, GameDetailsTopRecord } from './game-details-types';
export type { GamesApi, GamesListResponse, GamesRequestOptions } from './games-api';
export {
  DEFAULT_GAME_SORT,
  GAME_CATEGORIES,
  GAME_CATEGORY_ALL,
  GAME_SORTS,
  type GameCategory,
  type GameListItem,
  type GameSort,
  type GamesListMeta,
  type GamesListParameters,
} from './games-types';
export type { LeaderboardRequestOptions, LeaderboardResponse } from './leaderboard-api';
export type { LeaderboardEntry, LeaderboardMeta } from './leaderboard-types';

const MOCK_SCENARIOS = new Set<string>(['success', 'empty', '401', '404', '429']);

function isMockScenario(value: string | undefined): value is FakeGamesScenario {
  return value !== undefined && MOCK_SCENARIOS.has(value);
}

const mockScenario = import.meta.env.VITE_API_MOCK;

export const gamesApi: GamesApi = isMockScenario(mockScenario)
  ? createFakeGamesApi(mockScenario)
  : {
      fetchGames,
      fetchFeaturedGames,
      fetchLeaderboard,
      fetchCategories,
      fetchGameDetails,
      fetchGameComments,
      toggleFavorite,
    };
