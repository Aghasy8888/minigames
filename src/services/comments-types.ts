export type GameCommentsSort = 'newest' | 'oldest';

export type GameComment = {
  commentId: string;
  authorName: string;
  /** Sanitized server-side; still rendered via `textContent`. */
  text: string;
  likesCount: number;
  /** Always false unless `userEmail` is supplied. */
  isLikedByCurrentUser: boolean;
  /** ISO 8601 UTC */
  createdAt: string;
};

/** Like toggle response; the comment id is only in the request path. */
export type CommentLikeResult = {
  isLikedByCurrentUser: boolean;
  likesCount: number;
};

export type GameCommentsMeta = {
  /** Total for the game, even when `limit` is used. */
  totalComments: number;
  returnedCount: number;
  sort?: string;
};
