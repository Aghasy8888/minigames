import { createFilterSortBar } from '../../features/filter-sort-bar';
import { createGameCards } from '../../features/game-cards';
import { createPagination } from '../../features/pagination';
import { createPageTitle } from '../../features/page-title';
import './library-page.scss';

export function renderLibraryPage(container: HTMLElement): void {
  container.className = 'library-page';
  container.replaceChildren(
    createPageTitle(),
    createFilterSortBar(),
    createGameCards(),
    createPagination(),
  );
}
