import { request, type ApiListResponse } from './api-client';
import type { GameDetails } from './game-details-types';

export type GameDetailsRequestOptions = {
  userEmail?: string;
  signal?: AbortSignal;
};

export type GameDetailsResponse = ApiListResponse<GameDetails>;

export function fetchGameDetails(
  slug: string,
  options: GameDetailsRequestOptions = {},
): Promise<GameDetailsResponse> {
  return request<GameDetails>(`/api/games/${encodeURIComponent(slug)}`, {
    query: { userEmail: options.userEmail },
    signal: options.signal,
  });
}
