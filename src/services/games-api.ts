import { request, type ApiListResponse } from './api-client';
import type { CategoriesRequestOptions, CategoriesResponse } from './categories-api';
import type { GameCommentsRequestOptions, GameCommentsResponse } from './comments-api';
import type { FavoriteToggleOptions, FavoriteToggleResponse } from './favorite-api';
import type { GameDetailsRequestOptions, GameDetailsResponse } from './game-details-api';
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
  fetchGameDetails: (
    slug: string,
    options?: GameDetailsRequestOptions,
  ) => Promise<GameDetailsResponse>;
  fetchGameComments: (
    slug: string,
    options?: GameCommentsRequestOptions,
  ) => Promise<GameCommentsResponse>;
  toggleFavorite: (slug: string, options: FavoriteToggleOptions) => Promise<FavoriteToggleResponse>;
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
