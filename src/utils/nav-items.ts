import { APP_PAGE, type AppPage, type RoutablePage } from './app-page';

export interface NavLinkTarget {
  /** Real page this link opens; omit for placeholders (they go Home and are never active). */
  readonly page?: RoutablePage;
}

export interface NavItem extends NavLinkTarget {
  readonly label: string;
}

export const HOME_LINK: NavLinkTarget = { page: APP_PAGE.home };

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', page: APP_PAGE.home },
  { label: 'Library', page: APP_PAGE.library },
  { label: 'Tournaments' },
  { label: 'Community' },
];

export function resolveNavTarget({ page }: NavLinkTarget): RoutablePage {
  return page ?? APP_PAGE.home;
}

export function syncActiveNavLinks(
  links: Iterable<HTMLAnchorElement>,
  currentPage: AppPage,
  activeClass: string,
): void {
  for (const link of links) {
    const isActive = link.dataset.navPage === currentPage;

    link.classList.toggle(activeClass, isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}
