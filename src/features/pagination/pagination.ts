import { disabledPaginationArrowIcon, enabledPaginationArrowIcon } from '../../assets/icons';
import { useDisconnectCleanup } from '../../hooks/use-disconnect-cleanup';
import type { LibraryGamesController, LibraryGamesState } from '../../hooks/use-library-games';
import { getLibraryQuery } from '../../store/library-query-store';
import { getVisiblePageNumbers } from '../../utils/get-visible-page-numbers';
import {
  getPageButtonAriaLabel,
  PAGINATION_MAX_VISIBLE_MOBILE,
  PAGINATION_MAX_VISIBLE_TABLET_UP,
  PAGINATION_NAV_ARIA_LABEL,
  PAGINATION_NEXT_ARIA_LABEL,
  PAGINATION_PREV_ARIA_LABEL,
  PAGINATION_TABLET_SM_MEDIA_QUERY,
} from './pagination-data';
import './pagination.scss';

export type CreatePaginationOptions = {
  controller: LibraryGamesController;
  onPageChange: (page: number) => void;
};

type PaginationView = {
  currentPage: number;
  totalPages: number;
};

function createArrowIcon(source: string, className: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = source;
  img.alt = '';
  img.className = className;
  img.setAttribute('aria-hidden', 'true');
  return img;
}

function displayedPageCount(currentPage: number, totalPages: number): number {
  return Math.max(totalPages, currentPage, 1);
}

export function createPagination({
  controller,
  onPageChange,
}: CreatePaginationOptions): HTMLElement {
  let lastKnownTotalPages = 1;
  let view: PaginationView = { currentPage: 1, totalPages: 1 };

  const root = document.createElement('div');
  root.className = 'pagination';

  const nav = document.createElement('nav');
  nav.className = 'pagination__controls';
  nav.setAttribute('aria-label', PAGINATION_NAV_ARIA_LABEL);

  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className =
    'pagination__button pagination__button--arrow pagination__button--prev';
  previousButton.setAttribute('aria-label', PAGINATION_PREV_ARIA_LABEL);
  const previousIcon = createArrowIcon(enabledPaginationArrowIcon, 'pagination__arrow-icon');
  previousButton.append(previousIcon);

  const pageList = document.createElement('ul');
  pageList.className = 'pagination__pages';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'pagination__button pagination__button--arrow pagination__button--next';
  nextButton.setAttribute('aria-label', PAGINATION_NEXT_ARIA_LABEL);
  const nextIcon = createArrowIcon(enabledPaginationArrowIcon, 'pagination__arrow-icon');
  nextButton.append(nextIcon);

  nav.append(previousButton, pageList, nextButton);
  root.append(nav);

  const tabletSmMediaQuery = globalThis.matchMedia(PAGINATION_TABLET_SM_MEDIA_QUERY);

  function getMaxVisible(): number {
    return tabletSmMediaQuery.matches
      ? PAGINATION_MAX_VISIBLE_TABLET_UP
      : PAGINATION_MAX_VISIBLE_MOBILE;
  }

  function syncArrowButton(
    button: HTMLButtonElement,
    icon: HTMLImageElement,
    disabled: boolean,
  ): void {
    button.disabled = disabled;
    icon.src = disabled ? disabledPaginationArrowIcon : enabledPaginationArrowIcon;
  }

  function renderPageButtons(currentPage: number, displayedTotal: number): void {
    const visiblePages = getVisiblePageNumbers(currentPage, displayedTotal, getMaxVisible());
    pageList.replaceChildren(
      ...visiblePages.map((page) => {
        const item = document.createElement('li');
        item.className = 'pagination__page-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pagination__button pagination__button--page';
        button.textContent = String(page);
        button.setAttribute('aria-label', getPageButtonAriaLabel(page));

        if (page === currentPage) {
          button.classList.add('pagination__button--active');
          button.setAttribute('aria-current', 'page');
        }

        button.addEventListener('click', () => {
          goToPage(page);
        });

        item.append(button);
        return item;
      }),
    );
  }

  function syncControls(nextView: PaginationView): void {
    view = nextView;
    const displayedTotal = displayedPageCount(nextView.currentPage, nextView.totalPages);
    syncArrowButton(previousButton, previousIcon, nextView.currentPage <= 1);
    syncArrowButton(nextButton, nextIcon, nextView.currentPage >= displayedTotal);
    renderPageButtons(nextView.currentPage, displayedTotal);
  }

  function resolveView(state: LibraryGamesState): PaginationView {
    const requestedPage = getLibraryQuery().page;

    if (state.status === 'success' || state.status === 'empty') {
      const totalPages = state.meta?.totalPages ?? 0;
      const currentPage = totalPages === 0 ? 1 : (state.meta?.page ?? requestedPage);
      lastKnownTotalPages = totalPages;
      return { currentPage, totalPages };
    }

    return { currentPage: requestedPage, totalPages: lastKnownTotalPages };
  }

  function goToPage(page: number): void {
    const displayedTotal = displayedPageCount(view.currentPage, view.totalPages);
    const nextPage = Math.min(Math.max(page, 1), displayedTotal);
    if (nextPage === view.currentPage) {
      return;
    }
    onPageChange(nextPage);
  }

  function render(state: LibraryGamesState): void {
    syncControls(resolveView(state));
  }

  previousButton.addEventListener('click', () => {
    goToPage(view.currentPage - 1);
  });

  nextButton.addEventListener('click', () => {
    goToPage(view.currentPage + 1);
  });

  const onViewportChange = (): void => {
    syncControls(view);
  };

  tabletSmMediaQuery.addEventListener('change', onViewportChange);

  const unsubscribe = controller.subscribe(render);
  render(controller.getState());

  useDisconnectCleanup(root, () => {
    unsubscribe();
    tabletSmMediaQuery.removeEventListener('change', onViewportChange);
  });

  return root;
}
