import { request, type ApiListResponse } from './api-client';
import type { GameListItem, GamesListMeta, GamesListParameters } from './games-types';

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
