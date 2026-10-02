import { gamesApi, type GameListItem } from '../services/games-api-provider';
import { useLoadState, type LoadState, type LoadStateController } from './use-load-state';

export type { LoadState } from './use-load-state';

export type FeaturedGamesState = LoadState<GameListItem>;

export type FeaturedGamesController = LoadStateController<GameListItem>;

export function useFeaturedGames(): FeaturedGamesController {
  return useLoadState<GameListItem>({
    async load(signal) {
      const { data } = await gamesApi.fetchFeaturedGames({ signal });
      return data;
    },
    fallbackErrorMessage: 'New games are unavailable right now. Please try again.',
    retrySuccessMessage: 'New games loaded',
  });
}
