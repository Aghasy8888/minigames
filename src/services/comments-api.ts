import { request, type ApiListResponse } from './api-client';
import type { GameComment, GameCommentsMeta, GameCommentsSort } from './comments-types';

export type GameCommentsRequestOptions = {
  limit?: number;
  sort?: GameCommentsSort;
  userEmail?: string;
  signal?: AbortSignal;
};

export type GameCommentsResponse = ApiListResponse<GameComment[], GameCommentsMeta>;

export type PostGameCommentOptions = {
  userEmail: string;
  /** 2–30 characters; build it with `getCommentAuthorName`. */
  authorName: string;
  /** 1–500 characters after trimming. */
  text: string;
  signal?: AbortSignal;
};

/** 201 with the created comment; no `meta`, so refetch the list for the total count. */
export type PostGameCommentResponse = ApiListResponse<GameComment>;

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

export function postGameComment(
  slug: string,
  { userEmail, authorName, text, signal }: PostGameCommentOptions,
): Promise<PostGameCommentResponse> {
  return request<GameComment>(`/api/games/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    body: { userEmail, authorName, text },
    signal,
  });
}
