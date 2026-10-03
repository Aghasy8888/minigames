import { request, type ApiListResponse } from './api-client';
import type { CategoriesRequestOptions, CategoriesResponse } from './categories-api';
import type { GameListItem, GamesListMeta, GamesListParameters } from './games-types';
import type { LeaderboardRequestOptions, LeaderboardResponse } from './leaderboard-api';

export type GamesRequestOptions = {
  signal?: AbortSignal;
};

export type GamesListResponse = ApiListResponse<GameListItem[], GamesListMeta>;

export type GamesApi = {
  fetchGames: (
    parameters: GamesListParameters,
    options?: GamesRequestOptions,
  ) => Promise<GamesListResponse>;
  fetchFeaturedGames: (options?: GamesRequestOptions) => Promise<GamesListResponse>;
  fetchLeaderboard: (options?: LeaderboardRequestOptions) => Promise<LeaderboardResponse>;
  fetchCategories: (options?: CategoriesRequestOptions) => Promise<CategoriesResponse>;
};

export function fetchGames(
  parameters: GamesListParameters,
  options: GamesRequestOptions = {},
): Promise<GamesListResponse> {
  return request<GameListItem[], GamesListMeta>('/api/games', {
    query: {
      featured: parameters.featured,
      page: parameters.page,
      limit: parameters.limit,
      category: parameters.category,
      sort: parameters.sort,
    },
    signal: options.signal,
  });
}

export function fetchFeaturedGames(options: GamesRequestOptions = {}): Promise<GamesListResponse> {
  return fetchGames({ featured: true }, options);
}
