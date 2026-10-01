import type { AppPage, RoutablePage } from '../utils/app-page';
import { pathForPage, resolvePageFromPath } from '../utils/route-path';

export type { AppPage } from '../utils/app-page';

type NavigationListener = (page: AppPage) => void;

let currentPage: AppPage = resolvePageFromPath(globalThis.location.pathname);
const listeners = new Set<NavigationListener>();

function setCurrentPage(page: AppPage): void {
  if (page === currentPage) {
    return;
  }

  currentPage = page;

  for (const listener of listeners) {
    listener(currentPage);
  }
}

export function getCurrentPage(): AppPage {
  return currentPage;
}

export function subscribeNavigation(listener: NavigationListener): () => void {
  listeners.add(listener);
  listener(currentPage);

  return () => {
    listeners.delete(listener);
  };
}

export function navigate(page: RoutablePage): void {
  if (page === currentPage) {
    return;
  }

  globalThis.history.pushState(undefined, '', pathForPage(page));
  setCurrentPage(page);
  globalThis.scrollTo({ top: 0 });
}

export function syncPageFromLocation(): void {
  setCurrentPage(resolvePageFromPath(globalThis.location.pathname));
}
