import { createFilterSortBar } from '../../features/filter-sort-bar';
import { createGameCards } from '../../features/game-cards';
import { createPagination } from '../../features/pagination';
import { createPageTitle } from '../../features/page-title';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import { useLibraryGames } from '../../hooks/use-library-games';
import { navigateLibraryPage } from '../../store/library-query-store';
import './library-page.scss';

export function renderLibraryPage(container: HTMLElement): void {
  container.className = 'library-page';

  const libraryGames = useLibraryGames();
  const cards = createGameCards(libraryGames);

  container.replaceChildren(
    createPageTitle(),
    createFilterSortBar(),
    cards,
    createPagination({
      controller: libraryGames,
      onPageChange: navigateLibraryPage,
    }),
  );

  useDisconnectCleanup(cards, () => {
    libraryGames.destroy();
  });
}
