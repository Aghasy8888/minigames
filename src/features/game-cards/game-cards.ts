import { createEmptyState } from '../../components/empty-state';
import { createErrorBanner } from '../../components/error-banner';
import { createGameCard, createGameCardSkeleton } from '../../components/game-card';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import type { LibraryGamesController, LibraryGamesState } from '../../hooks/use-library-games';
import type { GameListItem } from '../../services/games-api-provider';
import {
  GAME_CARDS_ARIA_LABEL,
  GAME_CARDS_EMPTY_MESSAGE,
  GAME_CARDS_EMPTY_TITLE,
  GAME_CARDS_ERROR_FALLBACK_MESSAGE,
  GAME_CARDS_ERROR_TITLE,
  GAME_CARDS_RETRY_LABEL,
  LIBRARY_PAGE_SIZE,
} from './game-cards-data';
import './game-cards.scss';

function createCardList(cards: readonly HTMLElement[]): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'game-cards__list';

  for (const card of cards) {
    const item = document.createElement('li');
    item.className = 'game-cards__item';
    item.append(card);
    list.append(item);
  }

  return list;
}

function createSkeletonList(): HTMLUListElement {
  return createCardList(Array.from({ length: LIBRARY_PAGE_SIZE }, () => createGameCardSkeleton()));
}

function createGamesList(games: readonly GameListItem[]): HTMLUListElement {
  return createCardList(games.map((game) => createGameCard(game)));
}

function createStatusView(state: LibraryGamesState): HTMLElement {
  switch (state.status) {
    case 'loading': {
      return createSkeletonList();
    }
    case 'success': {
      return createGamesList(state.data);
    }
    case 'empty': {
      return createEmptyState({
        title: GAME_CARDS_EMPTY_TITLE,
        message: GAME_CARDS_EMPTY_MESSAGE,
      });
    }
    case 'error': {
      return createErrorBanner({
        title: GAME_CARDS_ERROR_TITLE,
        message: state.message === '' ? GAME_CARDS_ERROR_FALLBACK_MESSAGE : state.message,
        retryLabel: GAME_CARDS_RETRY_LABEL,
        onRetry: state.retry,
      });
    }
  }
}

export function createGameCards(libraryGames: LibraryGamesController): HTMLElement {
  const section = document.createElement('section');
  section.className = 'game-cards';
  section.setAttribute('aria-label', GAME_CARDS_ARIA_LABEL);

  const content = document.createElement('div');
  content.className = 'game-cards__content';

  function render(state: LibraryGamesState): void {
    content.setAttribute('aria-busy', String(state.status === 'loading'));
    content.replaceChildren(createStatusView(state));
  }

  const unsubscribe = libraryGames.subscribe(render);
  render(libraryGames.getState());

  useDisconnectCleanup(section, unsubscribe);

  section.append(content);
  return section;
}
