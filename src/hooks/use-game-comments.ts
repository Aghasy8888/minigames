import { gamesApi, type GameComment, type GameCommentsMeta } from '../services/games-api-provider';
import {
  useGameSlugLoad,
  type GameSlugLoadController,
  type GameSlugLoadState,
} from './use-game-slug-load';

export const GAME_COMMENTS_LIMIT = 3;

export type GameCommentsState = GameSlugLoadState<GameComment, GameCommentsMeta>;

export type GameCommentsController = GameSlugLoadController<GameComment, GameCommentsMeta>;

/** Latest comments + total count for the Game Details `?game=` slug (read-only for now). */
export function useGameComments(): GameCommentsController {
  return useGameSlugLoad<GameComment, GameCommentsMeta>({
    async load(slug, { signal, userEmail }) {
      const { data, meta } = await gamesApi.fetchGameComments(slug, {
        limit: GAME_COMMENTS_LIMIT,
        sort: 'newest',
        userEmail,
        signal,
      });
      return { items: data, meta };
    },
    fallbackErrorMessage: 'Comments are unavailable right now. Please try again.',
    retrySuccessMessage: 'Comments loaded',
  });
}
