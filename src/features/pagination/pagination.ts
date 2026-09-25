import { disabledPaginationArrowIcon, enabledPaginationArrowIcon } from '../../assets/icons';
import { getVisiblePageNumbers } from '../../utils/get-visible-page-numbers';
import {
  getPageButtonAriaLabel,
  PAGINATION_MAX_VISIBLE_MOBILE,
  PAGINATION_MAX_VISIBLE_TABLET_UP,
  PAGINATION_NAV_ARIA_LABEL,
  PAGINATION_NEXT_ARIA_LABEL,
  PAGINATION_PREV_ARIA_LABEL,
  PAGINATION_TABLET_SM_MEDIA_QUERY,
  TOTAL_PAGES,
} from './pagination-data';
import './pagination.scss';

export interface CreatePaginationOptions {
  totalPages?: number;
}

function createArrowIcon(source: string, className: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = source;
  img.alt = '';
  img.className = className;
  img.setAttribute('aria-hidden', 'true');
  return img;
}

export function createPagination(options: CreatePaginationOptions = {}): HTMLElement {
  const { totalPages = TOTAL_PAGES } = options;
  let currentPage = 1;

  const section = document.createElement('section');
  section.className = 'pagination';

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
  section.append(nav);

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

  function renderPageButtons(): void {
    const visiblePages = getVisiblePageNumbers(currentPage, totalPages, getMaxVisible());
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

  function syncControls(): void {
    syncArrowButton(previousButton, previousIcon, currentPage <= 1);
    syncArrowButton(nextButton, nextIcon, currentPage >= totalPages);
    renderPageButtons();
  }

  function goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage) {
      return;
    }
    currentPage = nextPage;
    syncControls();
  }

  previousButton.addEventListener('click', () => {
    goToPage(currentPage - 1);
  });

  nextButton.addEventListener('click', () => {
    goToPage(currentPage + 1);
  });

  const onViewportChange = (): void => {
    syncControls();
  };

  tabletSmMediaQuery.addEventListener('change', onViewportChange);

  syncControls();
  return section;
}
