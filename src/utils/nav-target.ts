import type { AppPage } from '../store/navigation-store';
import { HOME_HREF, LIBRARY_HREF } from './home-href';

export function hrefForNavLabel(label: string): string {
  return label === 'Library' ? LIBRARY_HREF : HOME_HREF;
}

export function pageForNavLabel(label: string): AppPage {
  return label === 'Library' ? 'library' : 'home';
}

export function pageForAppHref(href: string): AppPage {
  return href === LIBRARY_HREF ? 'library' : 'home';
}
