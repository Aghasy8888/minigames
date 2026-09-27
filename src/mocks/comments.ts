import tukoniCommentsSeed from './comments-tukoni-forest-keepers.json';

export type GameComment = {
  commentId: string;
  authorName: string;
  text: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
};

export type GameCommentsMeta = {
  totalComments: number;
  returnedCount: number;
  sort: string;
};

export type GameCommentsResponse = {
  data: GameComment[];
  meta: GameCommentsMeta;
};

export const tukoniComments = tukoniCommentsSeed as GameCommentsResponse;
