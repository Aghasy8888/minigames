import { request, type ApiListResponse } from './api-client';
import type { CommentLikeResult } from './comments-types';

export type CommentLikeToggleOptions = {
  userEmail: string;
  signal?: AbortSignal;
};

export type CommentLikeToggleResponse = ApiListResponse<CommentLikeResult>;

/** One endpoint likes and unlikes: every successful call flips the state, so never replay it. */
export function toggleCommentLike(
  commentId: string,
  { userEmail, signal }: CommentLikeToggleOptions,
): Promise<CommentLikeToggleResponse> {
  return request<CommentLikeResult>(`/api/comments/${encodeURIComponent(commentId)}/like`, {
    method: 'POST',
    body: { userEmail },
    signal,
  });
}
