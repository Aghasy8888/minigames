import { createEmptyState } from '../../components/empty-state';
import { createErrorBanner } from '../../components/error-banner';
import {
  createFilterChips,
  createFilterChipsSkeleton,
  type FilterChips,
} from '../../components/filter-chips';
import { createSortDropdown } from '../../components/sort-dropdown';
import type { CategoriesController, CategoriesState } from '../../hooks/use-categories';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import {
  canSortLibraryGames,
  type LibraryGamesController,
  type LibraryGamesState,
} from '../../hooks/use-library-games';
import { LOAD_STATUS } from '../../hooks/use-load-state';
import {
  getLibraryQuery,
  getResolvedCategory,
  navigateLibraryCategory,
  navigateLibrarySort,
  subscribeLibraryQuery,
} from '../../store/library-query-store';
import { isGameCategory } from '../../utils/library-query';
import {
  CATEGORIES_EMPTY_MESSAGE,
  CATEGORIES_EMPTY_TITLE,
  CATEGORIES_ERROR_TITLE,
  CATEGORIES_RETRY_LABEL,
  CATEGORY_SKELETON_COUNT,
  FILTER_SORT_BAR_ARIA_LABEL,
} from './filter-sort-bar-data';
import './filter-sort-bar.scss';

const { loading, success, empty, error } = LOAD_STATUS;

export type CreateFilterSortBarOptions = {
  categories: CategoriesController;
  games: LibraryGamesController;
};

function selectCategory(slug: string): void {
  if (isGameCategory(slug)) {
    navigateLibraryCategory(slug);
  }
}

export function createFilterSortBar({
  categories,
  games,
}: CreateFilterSortBarOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'filter-sort-bar';
  section.setAttribute('aria-label', FILTER_SORT_BAR_ARIA_LABEL);

  const categoriesArea = document.createElement('div');
  categoriesArea.className = 'filter-sort-bar__categories';

  let chips: FilterChips | undefined;

  function createCategoriesView(state: CategoriesState): HTMLElement {
    chips = undefined;

    switch (state.status) {
      case loading: {
        return createFilterChipsSkeleton(CATEGORY_SKELETON_COUNT);
      }
      case success: {
        chips = createFilterChips({
          categories: state.data,
          activeSlug: getResolvedCategory(),
          onSelect: selectCategory,
        });
        return chips.element;
      }
      case empty: {
        return createEmptyState({
          title: CATEGORIES_EMPTY_TITLE,
          message: CATEGORIES_EMPTY_MESSAGE,
        });
      }
      case error: {
        const { message, retry } = state;
        return createErrorBanner({
          title: CATEGORIES_ERROR_TITLE,
          message,
          retryLabel: CATEGORIES_RETRY_LABEL,
          onRetry: retry,
        });
      }
    }
  }

  function renderCategories(state: CategoriesState): void {
    categoriesArea.setAttribute('aria-busy', String(state.status === loading));
    categoriesArea.replaceChildren(createCategoriesView(state));
  }

  const sortDropdown = createSortDropdown({
    selectedId: getLibraryQuery().sort,
    onSelect: navigateLibrarySort,
  });

  function syncSortAvailability(state: LibraryGamesState): void {
    const sortable = canSortLibraryGames(state);
    if (sortable !== undefined) {
      sortDropdown.setDisabled(!sortable);
    }
  }

  const unsubscribeCategories = categories.subscribe(renderCategories);
  const unsubscribeGames = games.subscribe(syncSortAvailability);
  const unsubscribeQuery = subscribeLibraryQuery((query) => {
    chips?.setActiveSlug(getResolvedCategory());
    sortDropdown.setSelectedId(query.sort);
  });

  renderCategories(categories.getState());
  syncSortAvailability(games.getState());
  section.append(categoriesArea, sortDropdown.element);

  useDisconnectCleanup(section, () => {
    unsubscribeCategories();
    unsubscribeGames();
    unsubscribeQuery();
    sortDropdown.destroy();
  });

  return section;
}
