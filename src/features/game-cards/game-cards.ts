import { createGameCard } from '../../components/game-card';
import {
  GAME_CARDS_ARIA_LABEL,
  GAME_CARDS_WIDE_MEDIA_QUERY,
  getLibraryGameListItems,
  type LibraryGameListItem,
} from './game-cards-data';
import './game-cards.scss';

function resolveListOrder(item: LibraryGameListItem, isWideLayout: boolean): number {
  return isWideLayout ? item.orderWide : item.orderNarrow;
}

export function createGameCards(): HTMLElement {
  const games = getLibraryGameListItems();

  const section = document.createElement('section');
  section.className = 'game-cards';
  section.setAttribute('aria-label', GAME_CARDS_ARIA_LABEL);

  const list = document.createElement('ul');
  list.className = 'game-cards__list';

  const listItems: HTMLLIElement[] = [];

  for (const game of games) {
    const item = document.createElement('li');
    item.className = 'game-cards__item';
    item.append(createGameCard(game));
    list.append(item);
    listItems.push(item);
  }

  const wideMediaQuery = globalThis.matchMedia(GAME_CARDS_WIDE_MEDIA_QUERY);

  function syncItemOrders(): void {
    const isWideLayout = wideMediaQuery.matches;

    for (const [index, item] of listItems.entries()) {
      const game = games[index];
      if (!game) {
        continue;
      }
      item.style.order = String(resolveListOrder(game, isWideLayout));
    }
  }

  wideMediaQuery.addEventListener('change', syncItemOrders);
  syncItemOrders();

  section.append(list);
  return section;
}
