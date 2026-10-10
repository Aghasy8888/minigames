import { request, type ApiListResponse } from './api-client';
import type { FavoriteToggleResult } from './favorite-types';

export type FavoriteToggleOptions = {
  userEmail: string;
  signal?: AbortSignal;
};

export type FavoriteToggleResponse = ApiListResponse<FavoriteToggleResult>;

/** One endpoint adds and removes: every successful call flips the state, so never replay it. */
export function toggleFavorite(
  slug: string,
  { userEmail, signal }: FavoriteToggleOptions,
): Promise<FavoriteToggleResponse> {
  return request<FavoriteToggleResult>(`/api/games/${encodeURIComponent(slug)}/favorite`, {
    method: 'POST',
    body: { userEmail },
    signal,
  });
}
