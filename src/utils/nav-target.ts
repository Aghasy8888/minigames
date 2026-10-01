import { APP_PAGE, type RoutablePage } from './app-page';
import { HOME_HREF, LIBRARY_HREF } from './home-href';

const { home, library } = APP_PAGE;

export function hrefForNavLabel(label: string): string {
  return label === 'Library' ? LIBRARY_HREF : HOME_HREF;
}

export function pageForNavLabel(label: string): RoutablePage {
  return label === 'Library' ? library : home;
}

export function pageForAppHref(href: string): RoutablePage {
  return href === LIBRARY_HREF ? library : home;
}
