import { renderHomePage } from '../pages/home/home-page';
import { renderLibraryPage } from '../pages/library/library-page';
import { renderNotFoundPage } from '../pages/not-found/not-found-page';
import { subscribeNavigation, syncPageFromLocation } from '../store/navigation-store';
import { APP_PAGE, type AppPage } from '../utils/app-page';

export type { AppPage } from '../store/navigation-store';
export { getCurrentPage, navigate, subscribeNavigation } from '../store/navigation-store';

const { home, library, notFound } = APP_PAGE;

const PAGE_RENDERERS: Readonly<Record<AppPage, (outlet: HTMLElement) => void>> = {
  [home]: renderHomePage,
  [library]: renderLibraryPage,
  [notFound]: renderNotFoundPage,
};

export function startRouter(outlet: HTMLElement): void {
  syncPageFromLocation();
  globalThis.addEventListener('popstate', syncPageFromLocation);
  subscribeNavigation((page) => {
    PAGE_RENDERERS[page](outlet);
  });
}
