import { LIBRARY_PAGE_SIZE } from '../features/game-cards/game-cards-data';
import { gamesApi, type GameListItem, type GamesListMeta } from '../services/games-api-provider';
import {
  getLibraryQuery,
  getResolvedCategory,
  subscribeLibraryQuery,
} from '../store/library-query-store';
import { getCurrentPage } from '../store/navigation-store';
import { APP_PAGE } from '../utils/app-page';
import {
  LOAD_STATUS,
  useLoadState,
  type LoadState,
  type LoadStateController,
} from './use-load-state';

const { loading, success, empty, error } = LOAD_STATUS;

export type LibraryGamesState = LoadState<GameListItem, GamesListMeta>;

export type LibraryGamesController = LoadStateController<GameListItem, GamesListMeta>;

export function canSortLibraryGames(state: LibraryGamesState): boolean | undefined {
  switch (state.status) {
    case loading: {
      return undefined;
    }
    case success: {
      const { data, meta } = state;
      return (meta?.totalItems ?? data.length) > 1;
    }
    case empty: {
      return false;
    }
    case error: {
      return true;
    }
  }
}

export function useLibraryGames(): LibraryGamesController {
  const controller = useLoadState<GameListItem, GamesListMeta>({
    async load(signal) {
      const { page, sort } = getLibraryQuery();
      const { data, meta } = await gamesApi.fetchGames(
        { page, limit: LIBRARY_PAGE_SIZE, category: getResolvedCategory(), sort },
        { signal },
      );
      return { items: data, meta };
    },
    fallbackErrorMessage: 'Games are unavailable right now. Please try again.',
    retrySuccessMessage: 'Games loaded',
  });

  const unsubscribeQuery = subscribeLibraryQuery(() => {
    if (getCurrentPage() !== APP_PAGE.library) {
      return;
    }

    controller.reload();
  });

  return {
    getState: controller.getState,
    subscribe: controller.subscribe,
    reload: controller.reload,
    destroy() {
      unsubscribeQuery();
      controller.destroy();
    },
  };
}
