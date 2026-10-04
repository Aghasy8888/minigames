import { request, type ApiListResponse } from './api-client';
import type { GameComment, GameCommentsMeta, GameCommentsSort } from './comments-types';

export type GameCommentsRequestOptions = {
  limit?: number;
  sort?: GameCommentsSort;
  userEmail?: string;
  signal?: AbortSignal;
};

export type GameCommentsResponse = ApiListResponse<GameComment[], GameCommentsMeta>;

export function fetchGameComments(
  slug: string,
  options: GameCommentsRequestOptions = {},
): Promise<GameCommentsResponse> {
  return request<GameComment[], GameCommentsMeta>(
    `/api/games/${encodeURIComponent(slug)}/comments`,
    {
      query: { limit: options.limit, sort: options.sort, userEmail: options.userEmail },
      signal: options.signal,
    },
  );
}
